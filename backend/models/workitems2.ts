import type { PipelineStage } from 'mongoose';
import type { ParsedConfig } from './config.js';
import { getProjectConfig } from './config.js';
import { inDateRange } from './helpers.js';
import { WorkItemStateChangesModel } from './mongoose-models/WorkItemStateChanges.js';
import { fromContext, weekIndexValue, type QueryContext } from './utils.js';
import { noGroup } from '../../shared/work-item-utils.js';

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

export const getGraphDataForWorkItem =
  (graphType: 'newWorkItem' | 'velocity' | 'cycleTime') =>
  async (
    queryContent: QueryContext,
    workItemType: string,
    filters?: { label: string; values: string[] }[],
    priority?: number[]
  ) => {
    const { collectionName, project, startDate, endDate } = fromContext(queryContent);

    const { filterWorkItemsBy } = await getProjectConfig(collectionName, project);
    const workItemConfig = await getWorkItemConfig(collectionName, project, workItemType);

    if (!workItemConfig) return;

    return WorkItemStateChangesModel.aggregate<{
      groupName: string;
      countsByWeek: { weekIndex: number; count: number }[];
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
                    : workItemConfig.startStates,
                ],
              },
            },
          },
        },
      },
      { $unwind: '$stateChanges' },
      { $group: { _id: '$id', date: { $min: '$stateChanges.date' } } },
      { $match: { date: inDateRange(startDate, endDate) } },

      ...filterByFields(collectionName, filterWorkItemsBy, filters, priority),
      ...addGroupNameField(collectionName, workItemConfig.groupByField),

      {
        $group: {
          _id: { groupName: '$groupName', weekIndex: weekIndexValue(startDate, '$date') },
          workItems: { $push: '$$ROOT' },
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
