import type { PipelineStage } from 'mongoose';
import { z } from 'zod';
import { filter, head, identity, map, prop, range, sum } from 'rambda';
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
import { WorkItemTypeModel } from './mongoose-models/WorkItemType.js';

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

const addWorkItemDetails = (
  collectionName: string,
  workItemIdField = '$_id'
): PipelineStage[] => [
  {
    $lookup: {
      from: 'workitems',
      let: { workItemId: workItemIdField },
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
  { $project: { _id: 0, details: 0 } },
];

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
  duration: number;
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
      ...addWorkItemDetails(collectionName),
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
        states: prop('startStates'),
        dateRange: { $lt: startDate },
      },
      graphArgs,
      workItemConfig
    )),
    ...addWorkItemDetails(collectionName),
    {
      $lookup: {
        from: 'workitemstatechanges',
        let: { workItemId: '$id' },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: { $eq: ['$id', '$$workItemId'] },
              workItemType: graphArgs.workItemType,
            },
          },
          { $limit: 1 },
          { $project: { stateChanges: 1 } },
          {
            $addFields: {
              stateChanges: filterStateChangesMatching(workItemConfig.endStates),
            },
          },
          {
            $addFields: {
              hasEndStates: { $gt: [{ $size: '$stateChanges' }, 0] },
              date: { $min: '$stateChanges.date' },
            },
          },
        ],
        as: 'earliestEndStateChange',
      },
    },
    { $unwind: '$earliestEndStateChange' },
    {
      $match: {
        $or: [
          {
            $and: [
              { 'earliestEndStateChange.date': { $gt: startDate } },
              { 'earliestEndStateChange.hasEndStates': true },
            ],
          },
          { 'earliestEndStateChange.hasEndStates': false },
        ],
      },
    },
    {
      $group: {
        _id: '$groupName',
        count: { $sum: 1 },
        // For Debug
        // ids: { $push: '$id' },
      },
    },
    {
      $project: {
        _id: 0,
        groupName: '$_id',
        count: 1,
        // For Debug
        // ids: 1,
      },
    },

    // For Debug
    // { $project: { _id: 0, id: 1, earliestEndStateChange: 1 } },
  ]);
};

export const getWipTrendGraphDataFor =
  (stateType: 'startStates' | 'endStates') => async (graphArgs: GraphArgs) => {
    const { collectionName, project, startDate, endDate } = fromContext(
      graphArgs.queryContext
    );
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
          dateRange: inDateRange(startDate, endDate),
        },
        graphArgs,
        workItemConfig
      )),
      // In case of work item with endStates we need to make sure we check,
      // if said work items have startStates set from the config
      {
        $lookup: {
          from: 'workitemstatechanges',
          let: { workItemId: '$_id' },
          pipeline: [
            {
              $match: {
                collectionName,
                project,
                $expr: { $eq: ['$id', '$$workItemId'] },
                workItemType: graphArgs.workItemType,
              },
            },
            { $limit: 1 },
            { $project: { stateChanges: 1 } },
            {
              $addFields: {
                stateChanges: filterStateChangesMatching(workItemConfig.startStates),
              },
            },
            {
              $addFields: {
                hasStartStates: { $gt: [{ $size: '$stateChanges' }, 0] },
              },
            },
          ],
          as: 'states',
        },
      },
      { $unwind: '$states' },
      { $match: { 'states.hasStartStates': true } },
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
              // Debug
              // ids: '$workItemIds',
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

  // console.log(
  //   'wipCountBeforeStartDate :',
  //   JSON.stringify(wipCountBeforeStartDate, null, 2)
  // );

  // console.log(
  //   'workItemsCountWithStartStates :',
  //   JSON.stringify(workItemsCountWithStartStates, null, 2)
  // );

  // console.log(
  //   'workItemsCountWithEndStates :',
  //   JSON.stringify(workItemsCountWithEndStates, null, 2)
  // );

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

export const wipTrendOnDateWorkItemsInputParser = graphArgsInputParser.extend({
  date: z.date(),
});
export const getWipTrendOnDateWorkItems = async ({
  queryContext,
  workItemType,
  filters,
  priority,
  date,
}: z.infer<typeof wipTrendOnDateWorkItemsInputParser>) => {
  const { collectionName, project } = fromContext(queryContext);
  const workItemConfig = await getWorkItemConfig(collectionName, project, workItemType);

  if (!workItemConfig) return;

  return WorkItemStateChangesModel.aggregate<CountWorkItems>([
    ...(await workItemDataStages(
      {
        type: 'count',
        states: prop('startStates'),
        dateRange: { $lt: date },
      },
      { queryContext, workItemType, filters, priority },
      workItemConfig
    )),
    {
      $group: {
        _id: '$groupName',
        workItemIds: {
          $push: {
            id: '$_id',
            date: { $min: '$date' },
          },
        },
      },
    },
    { $addFields: { groupName: '$_id' } },
    { $unset: ['_id'] },
    { $unwind: '$workItemIds' },
    { $addFields: { workItemId: '$workItemIds.id', date: '$workItemIds.date' } },
    { $unset: 'workItemIds' },
    ...addWorkItemDetails(collectionName, '$workItemId'),
    { $project: { workItemId: 0 } },
    {
      $lookup: {
        from: 'workitemstatechanges',
        let: { workItemId: '$id' },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: { $eq: ['$id', '$$workItemId'] },
              workItemType,
            },
          },
          { $limit: 1 },
          { $project: { stateChanges: 1 } },
          {
            $addFields: {
              stateChanges: filterStateChangesMatching(workItemConfig.endStates),
            },
          },
          {
            $addFields: {
              hasEndStates: { $gt: [{ $size: '$stateChanges' }, 0] },
              date: { $min: '$stateChanges.date' },
            },
          },
        ],
        as: 'earliestEndStateChange',
      },
    },
    { $unwind: '$earliestEndStateChange' },
    {
      $match: {
        $or: [
          {
            $and: [
              { 'earliestEndStateChange.date': { $gt: date } },
              { 'earliestEndStateChange.hasEndStates': true },
            ],
          },
          { 'earliestEndStateChange.hasEndStates': false },
        ],
      },
    },
  ]);
};

export const bugGraphArgsInputParser = graphInputParser.extend({
  workItemType: z.string().default('Bug'),
});
type BugGraphArgs = z.infer<typeof bugGraphArgsInputParser>;

export type GroupedBugs = {
  bugs: {
    rootCauseType: string;
    count: number;
  }[];
  groupName: string;
};

export const getBugLeakage = async ({
  queryContext,
  filters,
  priority,
}: BugGraphArgs) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const { filterWorkItemsBy, workItemsConfig } = await getProjectConfig(
    collectionName,
    project
  );

  return Promise.all(
    (workItemsConfig || [])
      .filter(wic => isBugLike(wic.type) && wic.rootCause?.length)
      .map(async wic => {
        return {
          type: wic.type,
          data: await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            wic.rootCause!.map(async rootCause => {
              const bugWorkItems = await WorkItemModel.aggregate<GroupedBugs>([
                {
                  $match: {
                    collectionName,
                    project,
                    workItemType: wic.type,
                    createdDate: inDateRange(startDate, endDate),
                    ...(wic.ignoreStates?.length
                      ? { state: { $nin: wic.ignoreStates } }
                      : {}),
                  },
                },
                { $addFields: { rootCauseType: field(rootCause) } },
                {
                  $addFields: {
                    rootCauseType: { $ifNull: ['$rootCauseType', 'No Root Cause Type'] },
                  },
                },
                ...filterByFields(
                  collectionName,
                  filterWorkItemsBy,
                  filters,
                  priority,
                  '$id'
                ),
                ...addGroupNameField(collectionName, wic.groupByField, '$id'),
                {
                  $project: {
                    _id: 0,
                    id: 1,
                    groupName: 1,
                    rootCauseType: 1,
                  },
                },
                {
                  $group: {
                    _id: {
                      groupName: '$groupName',
                      rootCauseType: '$rootCauseType',
                    },
                    count: { $sum: 1 },
                  },
                },
                {
                  $group: {
                    _id: '$_id.groupName',
                    bugs: {
                      $push: {
                        rootCauseType: '$_id.rootCauseType',
                        count: '$count',
                      },
                    },
                  },
                },
                { $addFields: { groupName: '$_id' } },
                { $unset: '_id' },
              ]);
              return { rootCauseField: rootCause, groups: bugWorkItems };
            })
          ),
        };
      })
  );
};

export const getWorkCentersDuration = (
  workItemConfig: Awaited<ReturnType<typeof getWorkItemConfig>>
): PipelineStage[] => {
  return [
    { $addFields: { workCenters: workItemConfig?.workCenters } },
    { $unwind: '$workCenters' },
    {
      $addFields: {
        'workCenters.startStateDates': {
          $filter: {
            input: '$stateChanges',
            as: 'state',
            cond: { $in: ['$$state.state', '$workCenters.startStates'] },
          },
        },
        'workCenters.endStateDates': {
          $filter: {
            input: '$stateChanges',
            as: 'state',
            cond: { $in: ['$$state.state', '$workCenters.endStates'] },
          },
        },
      },
    },
    {
      $addFields: {
        'workCenters.duration': {
          $dateDiff: {
            startDate: { $min: '$workCenters.startStateDates.date' },
            endDate: { $min: '$workCenters.endStateDates.date' },
            unit: 'millisecond',
          },
        },
      },
    },
  ];
};

export const timeSpentArgs = graphArgsInputParser.extend({
  type: z.enum(['wip', 'closed']),
});

export const getWorkItemTimeSpent = async ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type,
  queryContext,
  workItemType,
  filters,
  priority,
}: z.infer<typeof timeSpentArgs>) => {
  const { collectionName, project } = fromContext(queryContext);
  const workItemConfig = await getWorkItemConfig(collectionName, project, workItemType);

  if (!workItemConfig) return;

  const workItems = await WorkItemStateChangesModel.aggregate<{
    groupName: string;
    id: number;
    url: string;
    stateChanges: { state: string; date: Date }[];
    cycleTime: number;
  }>([
    ...(await workItemDataStages(
      {
        type: 'datediff',
        startStates: prop('startStates'),
        endStates: prop('endStates'),
      },
      { queryContext, workItemType, filters, priority },
      workItemConfig
    )),
    {
      $project: {
        _id: 0,
        id: '$_id',
        groupName: 1,
        cycleTime: '$duration',
      },
    },
    {
      $lookup: {
        from: 'workitemstatechanges',
        let: { id: '$id' },
        pipeline: [
          {
            $match: {
              collectionName,
              $expr: { $eq: ['$id', '$$id'] },
            },
          },
          { $project: { _id: 0, stateChanges: 1 } },
        ],
        as: 'stateChanges',
      },
    },
    { $addFields: { stateChanges: { $first: '$stateChanges' } } },
    { $addFields: { stateChanges: '$stateChanges.stateChanges' } },
    { $unset: 'stateChanges._id' },
    {
      $lookup: {
        from: 'workitems',
        let: { id: '$id' },
        pipeline: [
          {
            $match: {
              collectionName,
              $expr: { $eq: ['$id', '$$id'] },
            },
          },
          { $project: { _id: 0, url: 1 } },
        ],
        as: 'url',
      },
    },
    { $addFields: { url: { $first: '$url.url' } } },
  ]);

  return workItems
    .map(wi => ({
      ...wi,
      // stateChanges: wi.stateChanges.slice(
      //   wi.stateChanges.findIndex(s => workItemConfig.startStates.includes(s.state))
      // ),
      url: wi.url.replace('/_apis/wit/workItems/', '/_workitems/edit/'),
    }))
    .filter(x => x.stateChanges.length !== 0);
};

export type WorkCenter = {
  label: string;
  duration: number | null;
};
export type FlowEfficiencyWorkItems = {
  groupName: string;
  workCentersDuration: number;
  cycleTime: number;
  count: number;
  workItemType: string;
};

export const getFlowEfficiencyData = async ({
  queryContext,
  workItemType,
  filters,
  priority,
}: GraphArgs) => {
  const { collectionName, project } = fromContext(queryContext);
  const [workItemConfig] = await Promise.all([
    // getProjectConfig(collectionName, project),
    getWorkItemConfig(collectionName, project, workItemType),
  ]);

  if (!workItemConfig) return;

  return WorkItemStateChangesModel.aggregate<FlowEfficiencyWorkItems>([
    ...(await workItemDataStages(
      {
        type: 'datediff',
        endStates: prop('endStates'),
        startStates: prop('startStates'),
      },
      { queryContext, workItemType, filters, priority },
      workItemConfig
    )),
    {
      $project: {
        _id: 0,
        id: '$_id',
        groupName: 1,
        date: 1,
        cycleTime: '$duration',
      },
    },
    {
      $lookup: {
        from: 'workitemstatechanges',
        let: { id: '$id' },
        pipeline: [
          {
            $match: {
              collectionName,
              $expr: { $eq: ['$id', '$$id'] },
            },
          },
          { $project: { _id: 0, stateChanges: 1 } },
        ],
        as: 'stateChanges',
      },
    },
    { $unwind: '$stateChanges' },
    { $addFields: { stateChanges: '$stateChanges.stateChanges' } },
    ...getWorkCentersDuration(workItemConfig),
    {
      $group: {
        _id: '$id',
        id: { $first: '$id' },
        date: { $first: '$date' },
        cycleTime: { $first: '$cycleTime' },
        groupName: { $first: '$groupName' },
        workCentersDuration: { $sum: '$workCenters.duration' },
      },
    },
    {
      $group: {
        _id: '$groupName',
        groupName: { $first: '$groupName' },
        workCentersDuration: { $sum: '$workCentersDuration' },
        cycleTime: { $sum: '$cycleTime' },
        count: { $sum: 1 },
      },
    },
    { $addFields: { workItemType } },
    { $project: { _id: 0 } },
  ]);
};

export const getFlowEfficiencyGraph = async (args: z.infer<typeof graphInputParser>) => {
  const { collectionName, project } = fromContext(args.queryContext);

  const config = await getProjectConfig(collectionName, project);

  return (
    Promise.all(
      config.workItemsConfig?.map(async wic => ({
        workItemType: wic.type,
        data: await getFlowEfficiencyData({ ...args, workItemType: wic.type }),
      })) || []
    )
      .then(filter(exists))
      .then(filter(x => Boolean(x?.data?.length)))
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .then(map(x => ({ ...x, data: x.data! })))
  );
};

type BugLeakageWorkItems = {
  id: number;
  state: string;
  url: string;
  date: Date;
  title: string;
  groupName: string;
  rootCauseType: string;
};
export const getBugLeakageDataForDrawer = async ({
  queryContext,
  filters,
  priority,
  workItemType = 'Bug',
}: BugGraphArgs) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const workItemConfig = await getWorkItemConfig(collectionName, project, workItemType);

  if (!workItemConfig?.rootCause) return;

  const { filterWorkItemsBy } = await getProjectConfig(collectionName, project);

  return Promise.all(
    workItemConfig.rootCause.map(async rootCause => {
      const bugWorkItems = await WorkItemModel.aggregate<BugLeakageWorkItems>([
        {
          $match: {
            collectionName,
            project,
            workItemType,
            createdDate: inDateRange(startDate, endDate),
            ...(workItemConfig.ignoreStates?.length
              ? { state: { $nin: workItemConfig.ignoreStates } }
              : {}),
          },
        },
        { $addFields: { rootCauseType: field(rootCause) } },
        {
          $addFields: {
            rootCauseType: { $ifNull: ['$rootCauseType', 'No Root Cause Type'] },
          },
        },
        ...filterByFields(collectionName, filterWorkItemsBy, filters, priority, '$id'),
        ...addGroupNameField(collectionName, workItemConfig.groupByField, '$id'),
        {
          $project: {
            _id: 0,
            id: 1,
            state: 1,
            url: 1,
            date: '$createdDate',
            title: 1,
            groupName: 1,
            rootCauseType: 1,
          },
        },
      ]);
      return { rootCauseField: rootCause, bugWorkItems };
    })
  );
};

export const groupByFieldAndStatesForWorkTypeParser = z.object({
  collectionName: z.string(),
  project: z.string(),
  workItemType: z.string(),
});

export const getGroupByFieldAndStatesForWorkType = async ({
  collectionName,
  project,
  workItemType,
}: z.infer<typeof groupByFieldAndStatesForWorkTypeParser>) =>
  WorkItemTypeModel.aggregate<{
    fields: { referenceName: string; name: string }[];
    states: { category: string; name: string }[];
  }>([
    { $match: { collectionName, project, name: workItemType } },
    {
      $project: {
        '_id': 0,
        'fields.referenceName': 1,
        'fields.name': 1,
        'states.category': 1,
        'states.name': 1,
      },
    },
  ])
    .exec()
    .then(x => head(x) || { fields: [], states: [] });
