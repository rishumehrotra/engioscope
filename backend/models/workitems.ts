import { model, Schema } from 'mongoose';
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
