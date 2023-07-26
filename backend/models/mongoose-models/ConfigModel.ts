import { model, Schema } from 'mongoose';

export type Config = {
  collectionName: string | null;
  project: string | null;
  filterBy?: {
    label: string;
    field: string[];
  }[];
  environments?: string[];
  templateRepoName?: string;
  workItemsConfig?: {
    type: string;
    groupByField?: string;
    startState?: string[];
    endState?: string[];
    rootCause?: string[];
    devCompletionState?: string[];
    ignoreStates: string[];
    workCenters?: {
      label: string;
      startState?: string[];
      endState?: string[];
    }[];
  }[];
};

const configSchema = new Schema<Config>(
  {
    collectionName: { type: String, default: null },
    project: { type: String, default: null },
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
        type: { type: String, required: true },
        groupByField: String,
        startState: [String],
        endState: [String],
        rootCause: [String],
        devCompletionState: [String],
        ignoreStates: [String],
        workCenters: [
          {
            label: String,
            startState: [String],
            endState: [String],
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export const ConfigModel = model<Config>('Config', configSchema);
