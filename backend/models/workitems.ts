import { model, Schema } from 'mongoose';
import { configForCollection } from '../config.js';
import type { WorkItemWithRelations } from '../scraper/types-azure.js';

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

export const newWorkItemsForWorkItemType = ({
  collectionName, project, workItemType, queryPeriod
}: {
  collectionName: string;
  project: string;
  workItemType: string;
  queryPeriod: [Date, Date, string];
}) => {
  const collectionConfig = configForCollection(collectionName);
  const workItemTypeConfig = collectionConfig?.workitems.types?.find(t => t.type === workItemType);
  const startDateFields = workItemTypeConfig?.startDate.map(field);

  return (
    WorkItemModel
      .aggregate([
        {
          $match: {
            collectionName,
            project,
            workItemType,
            state: { $nin: collectionConfig?.workitems.ignoreStates || [] },
            stateChangeDate: { $gte: queryPeriod[0] }
            // $expr: { $eq: [field('Jio.Common.FeatureType'), 'New Feature'] }
          }
        },
        // Get the start date based on the config's start date fields
        { $addFields: { startDate: { $min: startDateFields || [] } } },
        // Ensure it's within range
        { $match: { startDate: { $gte: queryPeriod[0], $lt: queryPeriod[1] } } },
        {
          $group: {
            _id: {
              group: workItemTypeConfig?.groupByField
                ? field(workItemTypeConfig?.groupByField)
                : 'No group',
              date: {
                $dateToString: {
                  date: '$startDate', timezone: queryPeriod[2], format: '%Y-%m-%d'
                }
              }
            },
            count: { $sum: 1 }
          }
        }, {
          $group: {
            _id: '$_id.group',
            count: { $push: { k: '$_id.date', v: '$count' } }
          }
        }, {
          $project: { _id: 1, counts: { $arrayToObject: '$count' } }
        }
      ])
      .then(result => result.map(r => (
        { group: r._id, counts: r.counts } as { group: string; counts: Record<string, number> }
      )))
  );
};
