import type { PipelineStage } from 'mongoose';
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

export const getNewGraphForWorkItem = async (
  queryContent: QueryContext,
  workItemType: string
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContent);

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
    { $limit: 10 },
  ]);
};
