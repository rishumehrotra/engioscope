import { model, Schema } from 'mongoose';

export type Config = {
  collectionName: string | null;
  projectName: string | null;
  filterBy?: {
    label: string;
    field: string[];
  }[];
  environments?: string[];
  templateRepoName?: string;
  workItemsConfig?: {
    workItemType: string;
    groupByField?: string;
    startState?: string[];
    endState?: string[];
    rootCause?: string[];
    devCompletionState?: string;
    workCenters?: {
      label: string;
      startField?: string[];
      endField?: string[];
    }[];
  }[];
};

const configSchema = new Schema<Config>({
  collectionName: { type: String, default: null },
  projectName: { type: String, default: null },
  filterBy: [
    {
      label: { type: String, required: true },
      field: [{ type: String, required: true }],
    },
  ],
  environments: [String],
  templateRepoName: String,
  workItemsConfig: [
    {
      workItemType: { type: String, required: true },
      groupByField: String,
      startState: [String],
      endState: [String],
      rootCause: [String],
      devCompletionState: String,
      workCenters: [
        {
          label: String,
          startField: [String],
          endField: [String],
        },
      ],
    },
  ],
});

export const ConfigModel = model<Config>('Config', configSchema);
