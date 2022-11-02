import { model, Schema } from 'mongoose';
import type { WorkItemType as AzureWorkItemType } from '../scraper/types-azure.js';
import type workItemIconSvgs from '../work-item-icon-svgs.js';

export type WorkItemType = {
  collectionName: string;
  project: string;
  name: string;
  referenceName: string;
  description: string;
  icon: {
    id: keyof typeof workItemIconSvgs;
    url: string;
  };
  fields: {
    referenceName: string;
    name: string;
    helpText?: string;
  }[];
  transitions: Record<string, { to: string }[]>;
  states: {
    name: string;
    color: string;
    category: string;
  }[];
};

const workItemTypeSchema = new Schema<WorkItemType>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  name: { type: String, required: true },
  referenceName: { type: String, required: true },
  description: String,
  icon: {
    id: { type: String, required: true },
    url: { type: String, required: true }
  },
  fields: [{
    referenceName: { type: String, required: true },
    name: { type: String, required: true },
    helpText: String
  }],
  transitions: Schema.Types.Mixed,
  states: [{
    name: { type: String, required: true },
    color: { type: String, required: true },
    category: { type: String, required: true }
  }]
});

workItemTypeSchema.index({ collectionName: 1, project: 1, referenceName: 1 });

const WorkItemTypeModel = model<WorkItemType>('WorkItemType', workItemTypeSchema);

const apiShapeToModelShape = (collectionName: string, project: string, workItemType: AzureWorkItemType): WorkItemType => ({
  collectionName,
  project,
  name: workItemType.name,
  referenceName: workItemType.referenceName,
  description: workItemType.description,
  icon: workItemType.icon,
  fields: workItemType.fields,
  transitions: workItemType.transitions,
  states: workItemType.states
});

export const bulkUpsertWorkItemTypes = (collectionName: string, project: string) => (
  (workItemTypes: AzureWorkItemType[]) => (
    WorkItemTypeModel.bulkWrite(workItemTypes.map(workItemType => ({
      updateOne: {
        filter: { collectionName, project, referenceName: workItemType.referenceName },
        update: { $set: apiShapeToModelShape(collectionName, project, workItemType) },
        upsert: true
      }
    })))
  )
);
