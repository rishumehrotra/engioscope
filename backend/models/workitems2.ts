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
  project: string,
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
              project,
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
  project: string,
  filterConfig: ParsedConfig['filterWorkItemsBy'],
  filterInput?: { label: string; values: string[] }[],
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
              project,
              $expr: { $eq: ['$id', '$$workItemId'] },
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

export const getNewGraphForWorkItem = async (
  queryContent: QueryContext,
  workItemType: string,
  filters?: { label: string; values: string[] }[]
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
            cond: { $in: ['$$state.state', workItemConfig.startStates] },
          },
        },
      },
    },
    { $unwind: '$stateChanges' },
    { $group: { _id: '$id', date: { $min: '$stateChanges.date' } } },
    { $match: { date: inDateRange(startDate, endDate) } },

    ...addGroupNameField(collectionName, project, workItemConfig.groupByField),

    ...filterByFields(collectionName, project, filterWorkItemsBy, filters),

    {
      $group: {
        _id: { groupName: '$groupName', weekIndex: weekIndexValue(startDate, '$date') },
        workItems: { $push: '$$ROOT' },
      },
    },
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
    {
      $addFields: {
        countsByWeek: {
          $sortArray: { input: '$countsByWeek', sortBy: { weekIndex: 1 } },
        },
      },
    },

    // { $count: 'count' },
    // { $limit: 10 },
  ]);
};
