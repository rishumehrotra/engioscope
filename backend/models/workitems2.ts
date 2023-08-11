import type { PipelineStage } from 'mongoose';
import { z } from 'zod';
import { filter, identity, map, prop, range, sum } from 'rambda';
import { byNum, byString, desc } from 'sort-lib';
import type { ParsedConfig } from './config.js';
import { getProjectConfig } from './config.js';
import { inDateRange } from './helpers.js';
import { WorkItemStateChangesModel } from './mongoose-models/WorkItemStateChanges.js';
import { fromContext, queryContextInputParser, weekIndexValue } from './utils.js';
import { isBugLike, noGroup } from '../../shared/work-item-utils.js';
import { divide, exists } from '../../shared/utils.js';
import { createIntervals } from '../utils.js';
import { WorkItemModel } from './mongoose-models/WorkItem.js';
import { getWorkItemConfig as getAllWorkItemConfigs } from './work-item-types.js';

const getWorkItemConfig = async (
  collectionName: string,
  project: string,
  workItemType: string
) => {
  const config = await getProjectConfig(collectionName, project);
  return config.workItemsConfig?.find(wic => wic.type === workItemType);
};

type WorkItemConfig = NonNullable<Awaited<ReturnType<typeof getWorkItemConfig>>>;

const field = (fieldName: string) => ({
  $getField: {
    field: { $literal: fieldName },
    input: '$fields',
  },
});

const addGroupNameField = (
  collectionName: string,
  groupByField?: string,
  workItemField = '$_id'
): PipelineStage[] => {
  if (!groupByField) return [{ $addFields: { groupName: noGroup } }];

  return [
    {
      $lookup: {
        from: 'workitems',
        let: { workItemId: workItemField },
        pipeline: [
          {
            $match: {
              collectionName,
              $expr: { $eq: ['$id', '$$workItemId'] },
            },
          },
          { $project: { group: field(groupByField) } },
        ],
        as: 'groupName',
      },
    },
    { $unwind: '$groupName' },
    { $addFields: { groupName: '$groupName.group' } },
  ];
};

const explodeFilterFieldValues = (
  filterConfig: NonNullable<ParsedConfig['filterWorkItemsBy']>
) => [
  {
    $addFields: Object.fromEntries(
      filterConfig.map(filter => {
        return [filter.label, filter.fields.map(field)];
      })
    ),
  },
  {
    $addFields: Object.fromEntries(
      filterConfig.map(filter => {
        return [
          filter.label,
          {
            $filter: {
              input: `$${filter.label}`,
              as: 'value',
              cond: {
                $and: [{ $ne: ['$$value', null] }, { $ne: ['$$value', ''] }],
              },
            },
          },
        ];
      })
    ),
  },
  {
    $addFields: Object.fromEntries(
      filterConfig.map(filter => {
        return [
          filter.label,
          {
            $reduce: {
              input: `$${filter.label}`,
              initialValue: '',
              in: {
                $concat: [
                  '$$value',
                  { $cond: [{ $eq: ['$$value', ''] }, '', ';'] },
                  '$$this',
                ],
              },
            },
          },
        ];
      })
    ),
  },
  {
    $project: Object.fromEntries(
      filterConfig.map(filter => [
        filter.label,
        {
          $filter: {
            input: { $split: [`$${filter.label}`, ';'] },
            as: 'items',
            cond: { $ne: ['$$items', ''] },
          },
        },
      ])
    ),
  },
];

const filterByFields = (
  collectionName: string,
  filterConfig: ParsedConfig['filterWorkItemsBy'],
  filterInput?: { label: string; values: string[] }[],
  priority?: number[],
  workItemIdField = '$_id'
): PipelineStage[] => {
  if (!filterInput && !priority) return [];

  return [
    {
      $lookup: {
        from: 'workitems',
        let: { workItemId: workItemIdField },
        pipeline: [
          {
            $match: {
              collectionName,
              $expr: { $eq: ['$id', '$$workItemId'] },
              ...(priority ? { priority: { $in: priority } } : {}),
            },
          },
          ...(filterConfig && filterInput
            ? [
                ...explodeFilterFieldValues(
                  filterConfig.filter(f =>
                    filterInput.some(filter => filter.label === f.label)
                  )
                ),
                {
                  $match: {
                    $and: filterInput.map(filter => ({
                      [`${filter.label}`]: { $in: filter.values },
                    })),
                  },
                },
              ]
            : []),
        ],
        as: 'filterFieldValues',
      },
    },

    { $match: { filterFieldValues: { $gt: ['$size', 0] } } },
    { $unset: 'filterFieldValues' },
  ];
};

export const graphInputParser = z.object({
  queryContext: queryContextInputParser,
  filters: z
    .array(z.object({ label: z.string(), values: z.array(z.string()) }))
    .optional(),
  priority: z.array(z.number()).optional(),
});

export const filterConfig = async ({
  queryContext,
}: Omit<z.infer<typeof graphInputParser>, 'priority'>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const config = await getProjectConfig(collectionName, project);

  // TODO: This is a hack. We should also consider the work item type
  const ignoreStates = config.workItemsConfig
    ?.flatMap(wic => wic.ignoreStates)
    .filter(exists);

  const results = await WorkItemModel.aggregate<Record<string, string[]>>([
    {
      $match: {
        collectionName,
        project,
        stateChangeDate: inDateRange(startDate, endDate),
        ...(ignoreStates?.length ? { state: { $nin: ignoreStates } } : {}),
      },
    },
    ...(config.filterWorkItemsBy
      ? explodeFilterFieldValues(config.filterWorkItemsBy)
      : []),
    {
      $group: {
        _id: null,
        ...(config.filterWorkItemsBy || []).reduce<Record<string, unknown>>(
          (acc, { label }) => ({
            ...acc,
            [label]: { $push: `$${label}` },
          }),
          {}
        ),
      },
    },
    {
      $project: {
        _id: 0,
        ...(config.filterWorkItemsBy || []).reduce(
          (acc, { label }) => ({
            ...acc,
            [label]: {
              $reduce: {
                input: `$${label}`,
                initialValue: [],
                in: { $setUnion: ['$$value', '$$this'] },
              },
            },
          }),
          {}
        ),
      },
    },
  ]);

  return Object.fromEntries(
    Object.entries(results[0] || {})
      .filter(([, values]) => values.length)
      .map(([key, values]) => [key, values.sort(byString(identity))])
  );
};

export const pageConfigInputParser = z.object({
  queryContext: queryContextInputParser,
});

export const getPageConfig = async ({
  queryContext,
}: z.infer<typeof pageConfigInputParser>) => {
  const { collectionName, project } = fromContext(queryContext);
  const [workItemConfig, filters] = await Promise.all([
    getAllWorkItemConfigs({ collectionName, project }),
    filterConfig({ queryContext }),
  ]);

  return { ...workItemConfig, filters };
};

const filterStateChangesMatching = (stages: string[]) => ({
  $filter: {
    input: '$stateChanges',
    as: 'state',
    cond: {
      $in: ['$$state.state', stages],
    },
  },
});

const addDateDiffField = (fromStates: string[], endStates: string[]): PipelineStage[] => [
  {
    $addFields: {
      startStatesChanges: filterStateChangesMatching(fromStates),
      endStatesChanges: filterStateChangesMatching(endStates),
    },
  },
  {
    $match: {
      $and: [
        { startStatesChanges: { $gt: ['$size', 0] } },
        { endStatesChanges: { $gt: ['$size', 0] } },
      ],
    },
  },
  {
    $addFields: {
      dateStarted: { $min: '$startStatesChanges.date' },
      dateCompleted: { $min: '$endStatesChanges.date' },
    },
  },
  {
    $addFields: {
      duration: {
        $dateDiff: {
          startDate: '$dateStarted',
          endDate: '$dateCompleted',
          unit: 'millisecond',
        },
      },
    },
  },
  { $unset: ['dateStarted', 'startStatesChanges', 'endStatesChanges'] },
];

const filterOutIfInIgnoredState = (ignoreStates?: string[]): PipelineStage[] => {
  if (!ignoreStates?.length) return [];
  return [
    {
      $addFields: {
        currentState: { $arrayElemAt: ['$stateChanges.state', -1] },
      },
    },
    { $match: { currentState: { $nin: ignoreStates } } },
  ];
};

type CountArgs = {
  type: 'count';
  states: (wic: WorkItemConfig) => string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dateRange?: any;
};

type DateDiffArgs = {
  type: 'datediff';
  startStates: (wic: WorkItemConfig) => string[];
  endStates: (wic: WorkItemConfig) => string[];
};

export type CountResponse = {
  groupName: string;
  countsByWeek: {
    weekIndex: number;
    count: number;
  }[];
};

export type DateDiffResponse = {
  groupName: string;
  countsByWeek: {
    weekIndex: number;
    count: number;
    totalDuration: number;
  }[];
};

export const graphArgsInputParser = graphInputParser.extend({ workItemType: z.string() });
type GraphArgs = z.infer<typeof graphArgsInputParser>;

const workItemDataStages = async (
  args: CountArgs | DateDiffArgs,
  { queryContext, workItemType, filters, priority }: GraphArgs,
  workItemConfig: WorkItemConfig
): Promise<PipelineStage[]> => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const { filterWorkItemsBy } = await getProjectConfig(collectionName, project);

  return [
    { $match: { collectionName, project, workItemType } },
    ...filterOutIfInIgnoredState(workItemConfig.ignoreStates),
    {
      $addFields: {
        stateChanges: filterStateChangesMatching(
          args.type === 'count'
            ? args.states(workItemConfig)
            : [...args.startStates(workItemConfig), ...args.endStates(workItemConfig)]
        ),
      },
    },
    ...(args.type === 'datediff'
      ? addDateDiffField(args.startStates(workItemConfig), args.endStates(workItemConfig))
      : []),
    { $unwind: '$stateChanges' },
    {
      $group: {
        _id: '$id',
        ...(args.type === 'count'
          ? { date: { $min: '$stateChanges.date' } }
          : {
              date: { $min: '$dateCompleted' },
              duration: { $first: '$duration' },
            }),
      },
    },
    {
      $match: {
        date:
          args.type === 'count' && args.dateRange
            ? args.dateRange
            : inDateRange(startDate, endDate),
      },
    },
    ...filterByFields(collectionName, filterWorkItemsBy, filters, priority),
    ...addGroupNameField(collectionName, workItemConfig.groupByField),
  ];
};

export type CountWorkItems = {
  id: number;
  date: Date;
  groupName: string;
  title: string;
  state: string;
  url: string;
};

export type DateDiffWorkItems = {
  id: number;
  date: Date;
  groupName: string;
  title: string;
  state: string;
  url: string;
};

export function getDrawerDataForWorkItem(
  args: CountArgs
): (args: GraphArgs) => Promise<CountWorkItems[]>;
export function getDrawerDataForWorkItem(
  args: DateDiffArgs
): (args: GraphArgs) => Promise<DateDiffWorkItems[]>;
export function getDrawerDataForWorkItem(args: CountArgs | DateDiffArgs) {
  return async (graphArgs: GraphArgs) => {
    const { queryContext, workItemType } = graphArgs;
    const { collectionName, project } = fromContext(queryContext);
    const [workItemConfig] = await Promise.all([
      // getProjectConfig(collectionName, project),
      getWorkItemConfig(collectionName, project, workItemType),
    ]);

    if (!workItemConfig) return;

    return WorkItemStateChangesModel.aggregate([
      ...(await workItemDataStages(args, graphArgs, workItemConfig)),
      {
        $lookup: {
          from: 'workitems',
          let: { workItemId: '$_id' },
          pipeline: [
            {
              $match: {
                collectionName,
                $expr: { $eq: ['$id', '$$workItemId'] },
              },
            },
            { $project: { title: 1, url: 1, state: 1, id: 1 } },
          ],
          as: 'details',
        },
      },
      { $unwind: '$details' },
      {
        $addFields: {
          id: '$details.id',
          title: '$details.title',
          state: '$details.state',
          url: {
            $replaceAll: {
              input: '$details.url',
              find: '/_apis/wit/workItems/',
              replacement: '/_workitems/edit/',
            },
          },
        },
      },
      { $unset: 'details' },
      { $project: { _id: 0 } },
    ]);
  };
}

export function getGraphDataForWorkItem(
  args: CountArgs
): (args: GraphArgs) => Promise<CountResponse[]>;
export function getGraphDataForWorkItem(
  args: DateDiffArgs
): (args: GraphArgs) => Promise<DateDiffResponse[]>;
export function getGraphDataForWorkItem(args: CountArgs | DateDiffArgs) {
  return async (graphArgs: GraphArgs) => {
    const { queryContext, workItemType } = graphArgs;
    const { collectionName, project, startDate } = fromContext(queryContext);
    const [{ environments }, workItemConfig] = await Promise.all([
      getProjectConfig(collectionName, project),
      getWorkItemConfig(collectionName, project, workItemType),
    ]);

    if (!workItemConfig) return;

    const result = await WorkItemStateChangesModel.aggregate([
      ...(await workItemDataStages(args, graphArgs, workItemConfig)),
      {
        $group: {
          _id: { groupName: '$groupName', weekIndex: weekIndexValue(startDate, '$date') },
          workItems: { $push: '$$ROOT' },
          ...(args.type === 'datediff' ? { totalDuration: { $sum: '$duration' } } : {}),
        },
      },
      { $sort: { '_id.weekIndex': 1 } },
      {
        $group: {
          _id: '$_id.groupName',
          countsByWeek: {
            $push: {
              weekIndex: '$_id.weekIndex',
              count: { $size: '$workItems' },
              ...(args.type === 'datediff' ? { totalDuration: '$totalDuration' } : {}),
            },
          },
        },
      },
      { $addFields: { groupName: '$_id' } },
      { $unset: '_id' },
    ]);

    if (isBugLike(workItemType) && environments) {
      const env = environments.map(e => e.toLocaleLowerCase());
      return result.sort(
        byNum((x: CountResponse | DateDiffResponse) =>
          env.indexOf(x.groupName.toLocaleLowerCase())
        )
      );
    }

    return result.sort(
      desc(
        byNum(x => {
          if (args.type === 'count') {
            return sum((x as CountResponse).countsByWeek.map(x => x.count));
          }

          return divide(
            sum((x as DateDiffResponse).countsByWeek.map(x => x.totalDuration)),
            sum((x as DateDiffResponse).countsByWeek.map(x => x.count))
          ).getOr(0);
        })
      )
    );
  };
}

const graphTypes = {
  new: {
    type: 'count',
    states: prop('startStates'),
  },
  velocity: {
    type: 'count',
    states: prop('endStates'),
  },
  cycleTime: {
    type: 'datediff',
    startStates: prop('startStates'),
    endStates: prop('endStates'),
  },
  changeLeadTime: {
    type: 'datediff',
    startStates: x => x.devCompletionStates || [],
    endStates: prop('endStates'),
  } as DateDiffArgs,
} as const;

export const getGraphOfType =
  <T extends CountResponse | DateDiffResponse>(
    graphType: (args: GraphArgs) => Promise<T[]>
  ) =>
  async (args: z.infer<typeof graphInputParser>) => {
    const { collectionName, project } = fromContext(args.queryContext);

    const config = await getProjectConfig(collectionName, project);

    return (
      Promise.all(
        config.workItemsConfig?.map(async wic => ({
          workItemType: wic.type,
          data: await graphType({ ...args, workItemType: wic.type }),
        })) || []
      )
        .then(filter(exists))
        .then(filter(x => Boolean(x?.data?.length)))
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .then(map(x => ({ ...x, data: x.data! })))
    );
  };

export const getNewGraph = getGraphOfType(getGraphDataForWorkItem(graphTypes.new));
export const getVelocityGraph = getGraphOfType(
  getGraphDataForWorkItem(graphTypes.velocity)
);
export const getCycleTimeGraph = getGraphOfType(
  getGraphDataForWorkItem(graphTypes.cycleTime)
);
export const getChangeLoadTimeGraph = getGraphOfType(
  getGraphDataForWorkItem(graphTypes.changeLeadTime)
);

export const getNewWorkItems = getDrawerDataForWorkItem(graphTypes.new);
export const getVelocityWorkItems = getDrawerDataForWorkItem(graphTypes.velocity);
export const getCycleTimeWorkItems = getDrawerDataForWorkItem(graphTypes.cycleTime);
export const getChangeLeadTimeWorkItems = getDrawerDataForWorkItem(
  graphTypes.changeLeadTime
);

export const getWipTrendGraphDataBeforeStartDate = async (graphArgs: GraphArgs) => {
  const { collectionName, project, startDate } = fromContext(graphArgs.queryContext);
  const workItemConfig = await getWorkItemConfig(
    collectionName,
    project,
    graphArgs.workItemType
  );

  if (!workItemConfig) return;

  return WorkItemStateChangesModel.aggregate<{
    groupName: string;
    count: number;
  }>([
    ...(await workItemDataStages(
      {
        type: 'count',
        states: prop('endStates'),
        dateRange: { $lt: startDate },
      },
      graphArgs,
      workItemConfig
    )),
    {
      $group: {
        _id: '$groupName',
        workItemIds: { $addToSet: '$_id' },
      },
    },
    { $addFields: { groupName: '$_id', count: { $size: '$workItemIds' } } },
    { $unset: ['_id', 'workItemIds'] },
  ]);
};

export const getWipTrendGraphDataFor =
  (stateType: 'startStates' | 'endStates') => async (graphArgs: GraphArgs) => {
    const { collectionName, project, startDate } = fromContext(graphArgs.queryContext);
    const workItemConfig = await getWorkItemConfig(
      collectionName,
      project,
      graphArgs.workItemType
    );

    if (!workItemConfig) return;

    return WorkItemStateChangesModel.aggregate<CountResponse>([
      ...(await workItemDataStages(
        {
          type: 'count',
          states: prop(stateType),
        },
        graphArgs,
        workItemConfig
      )),
      {
        $group: {
          _id: { groupName: '$groupName', weekIndex: weekIndexValue(startDate, '$date') },
          workItemIds: { $addToSet: '$_id' },
        },
      },
      { $sort: { '_id.weekIndex': 1 } },
      {
        $group: {
          _id: '$_id.groupName',
          countsByWeek: {
            $push: {
              weekIndex: '$_id.weekIndex',
              count: { $size: '$workItemIds' },
            },
          },
        },
      },
      { $addFields: { groupName: '$_id' } },
      { $unset: '_id' },
    ]);
  };

const getWipTrendGraphDataForStartStates = getWipTrendGraphDataFor('startStates');
const getWipTrendGraphDataForEndStates = getWipTrendGraphDataFor('endStates');

const getWipTrendGraphData = async ({
  queryContext,
  workItemType,
  filters,
  priority,
}: GraphArgs) => {
  const { startDate, endDate } = fromContext(queryContext);

  const [
    wipCountBeforeStartDate,
    workItemsCountWithStartStates,
    workItemsCountWithEndStates,
  ] = await Promise.all([
    getWipTrendGraphDataBeforeStartDate({
      queryContext,
      workItemType,
      filters,
      priority,
    }),

    getWipTrendGraphDataForStartStates({
      queryContext,
      workItemType,
      filters,
      priority,
    }),
    getWipTrendGraphDataForEndStates({
      queryContext,
      workItemType,
      filters,
      priority,
    }),
  ]);

  const { numberOfIntervals } = createIntervals(startDate, endDate);

  const groups = Array.from(
    new Set([
      ...(wipCountBeforeStartDate?.map(x => x.groupName) || []),
      ...(workItemsCountWithStartStates?.map(x => x.groupName) || []),
      ...(workItemsCountWithEndStates?.map(x => x.groupName) || []),
    ])
  );
  return groups.map((groupName): CountResponse => {
    const beforeStartDateWorkItems = wipCountBeforeStartDate?.find(
      x => x.groupName === groupName
    );

    const workItemsWithStartStates = workItemsCountWithStartStates?.find(
      x => x.groupName === groupName
    );

    const workItemsWithEndStates = workItemsCountWithEndStates?.find(
      x => x.groupName === groupName
    );

    const beforeStartDateWIPCount = beforeStartDateWorkItems?.count || 0;

    const groupWeeklyGraph = range(0, numberOfIntervals).map(weekIndex => {
      return {
        weekIndex,
        workInProgressCount:
          workItemsWithStartStates?.countsByWeek?.find(x => x.weekIndex === weekIndex)
            ?.count || 0,
        workDoneCount:
          workItemsWithEndStates?.countsByWeek?.find(x => x.weekIndex === weekIndex)
            ?.count || 0,
      };
    });

    const countsByWeek = groupWeeklyGraph.reduce<
      {
        weekIndex: number;
        count: number;
      }[]
    >((acc, curr) => {
      const { workInProgressCount, workDoneCount, weekIndex } = curr;

      const updatedCount = acc.length
        ? (acc.at(-1)?.count || 0) + workInProgressCount - workDoneCount
        : beforeStartDateWIPCount + workInProgressCount - workDoneCount;

      return [...acc, { weekIndex, count: updatedCount }];
    }, []);

    return { groupName, countsByWeek };
  });
};

export const getWipGraph = getGraphOfType(getWipTrendGraphData);

export const getDrawerDataForWipTrendOnDate = async (
  graphArgs: GraphArgs,
  date: Date
) => {
  const { collectionName, project } = fromContext(graphArgs.queryContext);
  const workItemConfig = await getWorkItemConfig(
    collectionName,
    project,
    graphArgs.workItemType
  );

  if (!workItemConfig) return;

  return WorkItemStateChangesModel.aggregate<CountWorkItems>([
    ...(await workItemDataStages(
      {
        type: 'count',
        states: prop('endStates'),
        dateRange: { $lt: date },
      },
      graphArgs,
      workItemConfig
    )),
    {
      $group: {
        _id: '$groupName',
        workItemIds: { $addToSet: '$_id' },
        date: { $min: '$date' },
      },
    },
    { $addFields: { groupName: '$_id' } },
    { $unset: ['_id'] },
    { $unwind: '$workItemIds' },
    { $addFields: { workItemId: '$workItemIds' } },
    { $unset: 'workItemIds' },
    {
      $lookup: {
        from: 'workitems',
        let: { workItemId: '$workItemId' },
        pipeline: [
          {
            $match: {
              collectionName,
              $expr: { $eq: ['$id', '$$workItemId'] },
            },
          },
          { $project: { title: 1, url: 1, state: 1, id: 1 } },
        ],
        as: 'details',
      },
    },
    { $unwind: '$details' },
    {
      $addFields: {
        id: '$details.id',
        title: '$details.title',
        state: '$details.state',
        url: {
          $replaceAll: {
            input: '$details.url',
            find: '/_apis/wit/workItems/',
            replacement: '/_workitems/edit/',
          },
        },
      },
    },
    { $unset: ['details', 'workItemId'] },
    { $project: { _id: 0 } },
    { $match: { state: { $ne: workItemConfig.endStates } } },
  ]);
};
