import type { PipelineStage } from 'mongoose';
import { model, Schema } from 'mongoose';
import { sum } from 'rambda';
import { z } from 'zod';
import { asc, byNum, desc } from '../../shared/sort-utils.js';
import { merge } from '../../shared/utils.js';
import { noGroup } from '../../shared/work-item-utils.js';
import { configForCollection } from '../config.js';
import type { WorkItemWithRelations } from '../scraper/types-azure.js';
import {
  collectionAndProjectInputs, queryRangeInputParser, timezone, queryRangeFilter
} from './helpers.js';

type WorkItem = {
  id: number;
  collectionName: string;
  project: string;
  workItemType: string;
  state: string;
  changeDate: Date;
  createdDate: Date;
  title: string;
  description: string;
  closedDate?: Date;
  stateChangeDate?: Date;
  priorty?: number;
  severity?: string;
  fields: Record<string, unknown>;
  url: string;
  relations?: {
    rel:
    | 'Microsoft.VSTS.Common.Affects-Forward'
    | 'Microsoft.VSTS.Common.Affects-Reverse'
    | 'Microsoft.VSTS.TestCase.SharedParameterReferencedBy-Forward'
    | 'Microsoft.VSTS.TestCase.SharedParameterReferencedBy-Reverse'
    | 'Microsoft.VSTS.Common.TestedBy-Forward'
    | 'Microsoft.VSTS.Common.TestedBy-Reverse'
    | 'Microsoft.VSTS.TestCase.SharedStepReferencedBy-Forward'
    | 'Microsoft.VSTS.TestCase.SharedStepReferencedBy-Reverse'
    | 'System.LinkTypes.Duplicate-Forward'
    | 'System.LinkTypes.Duplicate-Reverse'
    | 'System.LinkTypes.Dependency-Forward'
    | 'System.LinkTypes.Dependency-Reverse'
    | 'System.LinkTypes.Hierarchy-Forward'
    | 'System.LinkTypes.Hierarchy-Reverse'
    | 'System.LinkTypes.Related'
    | string;
    attributes: Record<string, unknown>;
  }[];
};

const workItemSchema = new Schema<WorkItem>({
  id: { type: Number, required: true },
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  workItemType: { type: String, required: true },
  state: { type: String, required: true },
  changeDate: { type: Date, required: true },
  createdDate: { type: Date, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  closedDate: Date,
  stateChangeDate: Date,
  priorty: Number,
  severity: String,
  fields: Schema.Types.Mixed,
  url: String,
  relations: [{
    rel: String,
    url: String,
    attributes: Schema.Types.Mixed
  }]
});

workItemSchema.index({ collectionName: 1, id: 1 }, { unique: true }); // Used for writes
workItemSchema.index({
  collectionName: 1, project: 1, workItemType: 1, state: 1
});

const WorkItemModel = model<WorkItem>('WorkItem', workItemSchema);

const apiShapeToModelShape = (collectionName: string, workItem: WorkItemWithRelations): WorkItem => ({
  id: workItem.id,
  collectionName,
  project: workItem.fields['System.TeamProject'],
  workItemType: workItem.fields['System.WorkItemType'],
  state: workItem.fields['System.State'],
  changeDate: new Date(workItem.fields['System.ChangedDate']),
  createdDate: new Date(workItem.fields['System.CreatedDate']),
  title: workItem.fields['System.Title'],
  description: workItem.fields['System.Description'],
  closedDate: workItem.fields['Microsoft.VSTS.Common.ClosedDate']
    ? new Date(workItem.fields['Microsoft.VSTS.Common.ClosedDate'])
    : undefined,
  stateChangeDate: workItem.fields['Microsoft.VSTS.Common.StateChangeDate']
    ? new Date(workItem.fields['Microsoft.VSTS.Common.StateChangeDate'])
    : undefined,
  priorty: workItem.fields['Microsoft.VSTS.Common.Priority'] || undefined,
  severity: workItem.fields['Microsoft.VSTS.Common.Severity'] || undefined,
  fields: workItem.fields,
  url: workItem.url,
  relations: workItem.relations
});

export const bulkUpsertWorkItems = (collectionName: string) => (workItems: WorkItemWithRelations[]) => (
  WorkItemModel.bulkWrite(workItems.map(workItem => ({
    updateOne: {
      filter: { collectionName, id: workItem.id },
      update: { $set: apiShapeToModelShape(collectionName, workItem) },
      upsert: true
    }
  })))
);

const field = (fieldName: string) => ({
  $getField: {
    field: { $literal: fieldName },
    input: '$fields'
  }
});

const sanitizeFieldName = (field: string) => field
  .replace(/\s/g, '_')
  .replace(/\./g, '_')
  .replace(/\$/g, '_');

const applyAdditionalFilters = (
  collectionName: string,
  additionalFilters?: Record<string, string[]>
) => {
  if (!additionalFilters) return [];

  return Object.entries(additionalFilters)
    .flatMap(([label, value]): PipelineStage[] => {
      const configForField = configForCollection(collectionName)
        ?.workitems.filterBy
        ?.find(f => f.label === label);

      if (!configForField) return [];

      if (configForField.fields.length === 1 && !configForField.delimiter) {
        // Single field, no delimiter, so exact match is sufficient
        return [
          { $match: { $expr: { $in: [field(configForField.fields[0]), value] } } }
        ];
      }

      return [
        // Concat the fields
        {
          $addFields: {
            [`${sanitizeFieldName(label)}-temp-1`]: {
              $concat: configForField.fields.flatMap(f => [
                { $ifNull: [field(f), ''] },
                ';'
              ])
            }
          }
        },
        // Split by the delimiter
        {
          $addFields: {
            [`${sanitizeFieldName(label)}-temp-2`]: {
              $split: [`$${sanitizeFieldName(label)}-temp-1`, configForField.delimiter]
            }
          }
        },
        // Filter out empty fields
        {
          $addFields: {
            [`${sanitizeFieldName(label)}`]: {
              $filter: {
                input: `$${sanitizeFieldName(label)}-temp-2`,
                as: 'part',
                cond: { $ne: ['$$part', ''] }
              }
            }
          }
        },
        // Check if value exists
        { $match: { [sanitizeFieldName(label)]: { $in: value } } }
      ];
    });
};

export const newWorkItemsInputParser = z.object({
  ...collectionAndProjectInputs,
  queryPeriod: queryRangeInputParser,
  additionalFilters: z.record(z.string(), z.array(z.string()))
});

const newWorkItemsForWorkItemType = ({
  collectionName, project, workItemType, queryPeriod, additionalFilters
}: z.infer<typeof newWorkItemsInputParser> & { workItemType: string }) => {
  const collectionConfig = configForCollection(collectionName);
  const workItemTypeConfig = collectionConfig?.workitems.types?.find(t => t.type === workItemType);
  const startDateFields = workItemTypeConfig?.startDate.map(field);

  const pipeline = [
    {
      $match: {
        collectionName,
        project,
        workItemType,
        state: { $nin: collectionConfig?.workitems.ignoreStates || [] },
        stateChangeDate: { $gte: queryPeriod[0] }
      }
    },
    // Get the start date based on the config's startDateFields
    { $addFields: { startDate: { $min: startDateFields || [] } } },
    // Ensure it's within range
    { $match: { startDate: queryRangeFilter(queryPeriod) } },
    ...applyAdditionalFilters(collectionName, additionalFilters),
    {
      $group: {
        _id: {
          // Group by the groupByField in config...
          group: workItemTypeConfig?.groupByField
            ? field(workItemTypeConfig?.groupByField)
            : noGroup,
          // ...and the startDate
          date: {
            $dateToString: {
              date: '$startDate', timezone: timezone(queryPeriod), format: '%Y-%m-%d'
            }
          }
        },
        count: { $sum: 1 }
      }
    }, {
      // Nest the startDate inside the group
      $group: { _id: '$_id.group', count: { $push: { k: '$_id.date', v: '$count' } } }
    }, {
      // And convert to object to reduce size
      $project: { _id: 1, counts: { $arrayToObject: '$count' } }
    }
  ];

  return (
    WorkItemModel
      .aggregate(pipeline)
      .then(result => Object.fromEntries(
        result
          .sort(desc(byNum(r => sum(Object.values(r.counts)))))
          .sort(asc(byNum(r => collectionConfig?.projects[0].environments?.indexOf(r._id) || -1)))
          .map((r): [string, Record<string, number> ] => ([r._id, r.counts]))
      ))
  );
};

export const newWorkItems = async (options: z.infer<typeof newWorkItemsInputParser>) => {
  const collConfig = configForCollection('JioMobilityAndEnterprise');
  if (!collConfig) return {};

  const { types } = collConfig.workitems;
  if (!types) return {};

  return (
    Promise.all(types.map(type => (
      newWorkItemsForWorkItemType({ ...options, workItemType: type.type })
        .then(result => {
          if (Object.keys(result).length === 0) return {};
          return ({ [type.type]: result });
        })
    )))
      .then(result => result.reduce(merge, {}))
  );
};
