import { model, Schema } from 'mongoose';

export type WorkItemStateChanges = {
  id: number;
  collectionName: string;
  project: string;
  workItemType: string;
  stateChanges: {
    state: string;
    date: Date;
  }[];
};

const workItemStateChanges = new Schema<WorkItemStateChanges>(
  {
    id: { type: Number, required: true },
    collectionName: { type: String, required: true },
    project: { type: String, required: true },
    workItemType: { type: String, required: true },
    stateChanges: [
      {
        state: { type: String, required: true },
        date: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);

workItemStateChanges.index({ collectionName: 1, id: 1 }, { unique: true }); // Used for writes

export const WorkItemStateChangesModel = model<WorkItemStateChanges>(
  'WorkItemStateChanges',
  workItemStateChanges
);
