import type { PipelineStage } from 'mongoose';
import { getProjectConfig } from './config.js';
import { inDateRange } from './helpers.js';
import { WorkItemStateChangesModel } from './mongoose-models/WorkItemStateChanges.js';
import { fromContext, type QueryContext } from './utils.js';

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
): PipelineStage[] =>
  groupByField
    ? [
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
      ]
    : [];

export const getNewGraphForWorkItem = async (
  queryContent: QueryContext,
  workItemType: string
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContent);

  const workItemConfig = await getWorkItemConfig(collectionName, project, workItemType);

  if (!workItemConfig) return;

  return WorkItemStateChangesModel.aggregate([
    {
      $match: {
        collectionName,
        project,
        workItemType,
      },
    },
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
    { $match: { 'stateChanges.date': inDateRange(startDate, endDate) } },
    { $group: { _id: '$id', date: { $min: '$stateChanges.date' } } },

    ...addGroupNameField(collectionName, project, workItemConfig.groupByField),

    // { $count: 'count' },
    { $limit: 10 },
  ]);
};
