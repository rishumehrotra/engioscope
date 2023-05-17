import { model, Schema } from 'mongoose';

export type WorkItem = {
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
  priority?: number;
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
    url?: string;
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
  priority: Number,
  severity: String,
  fields: Schema.Types.Mixed,
  url: String,
  relations: [
    {
      rel: String,
      url: String,
      attributes: Schema.Types.Mixed,
    },
  ],
});
workItemSchema.index({ collectionName: 1, id: 1 }, { unique: true }); // Used for writes

workItemSchema.index({
  collectionName: 1,
  project: 1,
  workItemType: 1,
  state: 1,
});

export const WorkItemModel = model<WorkItem>('WorkItem', workItemSchema);
