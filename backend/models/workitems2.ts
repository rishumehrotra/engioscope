import type { PipelineStage } from 'mongoose';
import { z } from 'zod';
import { filter, map } from 'rambda';
import type { ParsedConfig } from './config.js';
import { getProjectConfig } from './config.js';
import { inDateRange } from './helpers.js';
import { WorkItemStateChangesModel } from './mongoose-models/WorkItemStateChanges.js';
import { fromContext, weekIndexValue, queryContextInputParser } from './utils.js';
import { noGroup } from '../../shared/work-item-utils.js';
import { exists } from '../../shared/utils.js';

const getWorkItemConfig = async (
  collectionName: string,
  project: string,
  workItemType: string
) => {
  const config = await getProjectConfig(collectionName, project);
  return config.workItemsConfig?.find(wic => wic.type === workItemType);
};

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

const filterByFields = (
  collectionName: string,
  filterConfig: ParsedConfig['filterWorkItemsBy'],
  filterInput?: { label: string; values: string[] }[],
  priority?: number[],
  workItemIdField = '$_id'
): PipelineStage[] => {
  if (!filterConfig) return [];
  if (!filterInput) return [];

  const relevantFilterConfig = filterConfig.filter(f =>
    filterInput.some(filter => filter.label === f.label)
  );

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
          {
            $addFields: Object.fromEntries(
              relevantFilterConfig.map(filter => {
                return [filter.label, filter.fields.map(field)];
              })
            ),
          },
          {
            $addFields: Object.fromEntries(
              relevantFilterConfig.map(filter => {
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
              relevantFilterConfig.map(filter => {
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
              relevantFilterConfig.map(filter => [
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
          {
            $match: {
              $and: filterInput.map(filter => ({
                $or: filter.values.map(val => ({
                  [`${filter.label}`]: val,
                })),
              })),
            },
          },
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
  workItemType: z.string(),
  filters: z
    .array(z.object({ label: z.string(), values: z.array(z.string()) }))
    .optional(),
  priority: z.array(z.number()).optional(),
});

export const getGraphDataForWorkItem =
  (graphType: 'newWorkItem' | 'velocity' | 'cycleTime') =>
  async ({
    queryContext,
    workItemType,
    filters,
    priority,
  }: z.infer<typeof graphInputParser>) => {
    const { collectionName, project, startDate, endDate } = fromContext(queryContext);

    const { filterWorkItemsBy } = await getProjectConfig(collectionName, project);
    const workItemConfig = await getWorkItemConfig(collectionName, project, workItemType);

    if (!workItemConfig) return;

    return WorkItemStateChangesModel.aggregate<{
      groupName: string;
      countsByWeek: { weekIndex: number; count: number; totalDuration?: number }[];
    }>([
      { $match: { collectionName, workItemType } },
      {
        $addFields: {
          stateChanges: {
            $filter: {
              input: '$stateChanges',
              as: 'state',
              cond: {
                $in: [
                  '$$state.state',
                  graphType === 'newWorkItem'
                    ? workItemConfig.startStates
                    : graphType === 'velocity'
                    ? workItemConfig.endStates
                    : graphType === 'cycleTime'
                    ? [...workItemConfig.startStates, ...workItemConfig.endStates]
                    : workItemConfig.startStates,
                ],
              },
            },
          },
        },
      },
      ...(graphType === 'cycleTime'
        ? [
            {
              $addFields: {
                startStatesChanges: {
                  $filter: {
                    input: '$stateChanges',
                    as: 'state',
                    cond: { $in: ['$$state.state', workItemConfig.startStates] },
                  },
                },
                endStatesChanges: {
                  $filter: {
                    input: '$stateChanges',
                    as: 'state',
                    cond: { $in: ['$$state.state', workItemConfig.endStates] },
                  },
                },
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
            {
              $unset: ['dateStarted', 'startStatesChanges', 'endStatesChanges'],
            },
          ]
        : []),
      { $unwind: '$stateChanges' },
      {
        $group: {
          _id: '$id',
          ...(graphType === 'cycleTime'
            ? {
                date: { $min: '$dateCompleted' },
                duration: { $first: '$duration' },
              }
            : { date: { $min: '$stateChanges.date' } }),
        },
      },
      { $match: { date: inDateRange(startDate, endDate) } },
      ...filterByFields(collectionName, filterWorkItemsBy, filters, priority),
      ...addGroupNameField(collectionName, workItemConfig.groupByField),
      {
        $group: {
          _id: { groupName: '$groupName', weekIndex: weekIndexValue(startDate, '$date') },
          workItems: { $push: '$$ROOT' },
          ...(graphType === 'cycleTime' ? { totalDuration: { $sum: '$duration' } } : {}),
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
              ...(graphType === 'cycleTime' ? { totalDuration: '$totalDuration' } : {}),
            },
          },
        },
      },
      { $addFields: { groupName: '$_id' } },
      { $unset: '_id' },
    ]);
  };

export const getNewGraphForWorkItem = getGraphDataForWorkItem('newWorkItem');
export const getVelocityGraphForWorkItems = getGraphDataForWorkItem('velocity');
export const getCycleTimeGraphForWorkItems = getGraphDataForWorkItem('cycleTime');

export const getNewGraph = async (args: z.infer<typeof graphInputParser>) => {
  const { collectionName, project } = fromContext(args.queryContext);

  const config = await getProjectConfig(collectionName, project);

  return (
    Promise.all(
      config.workItemsConfig?.map(async wic => ({
        workItemType: wic.type,
        data: await getNewGraphForWorkItem({ ...args, workItemType: wic.type }),
      })) || []
    )
      .then(filter(exists))
      .then(filter(x => Boolean(x?.data?.length)))
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .then(map(x => ({ ...x, data: x.data! })))
  );
};
