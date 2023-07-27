import { model, Schema } from 'mongoose';

type WorkCenter = {
  label: string;
  startStates?: string[];
  endStates?: string[];
};

const requiredString = { type: String, required: true };
const nullableString = { type: String, default: null };
const maybeStringArray = { type: [String], default: undefined };

const workCenterSchema = new Schema<WorkCenter>({
  label: requiredString,
  startStates: maybeStringArray,
  endStates: maybeStringArray,
});

type WorkItemsConfig = {
  type: string;
  groupByField?: string;
  startStates?: string[];
  endStates?: string[];
  rootCause?: string[];
  devCompletionStates?: string[];
  ignoreStates: string[];
  workCenters?: {
    label: string;
    startStates?: string[];
    endStates?: string[];
  }[];
};

const workItemsConfigSchema = new Schema<WorkItemsConfig>({
  type: requiredString,
  groupByField: String,
  startStates: maybeStringArray,
  endStates: maybeStringArray,
  rootCause: maybeStringArray,
  devCompletionStates: maybeStringArray,
  ignoreStates: maybeStringArray,
  workCenters: {
    type: [workCenterSchema],
    default: undefined,
  },
});

type FilterBy = {
  label: string;
  field: string[];
};

const filterBySchema = new Schema<FilterBy>({
  label: requiredString,
  field: { type: [String], required: true },
});

export type Config = {
  collectionName: string | null;
  project: string | null;
  filterBy?: FilterBy[];
  environments?: string[];
  templateRepoName?: string;
  workItemsConfig?: WorkItemsConfig[];
};

const configSchema = new Schema<Config>(
  {
    collectionName: nullableString,
    project: nullableString,
    filterBy: {
      type: [filterBySchema],
      default: undefined,
    },
    environments: maybeStringArray,
    templateRepoName: String,
    workItemsConfig: {
      type: [workItemsConfigSchema],
      default: undefined,
    },
  },
  { timestamps: true }
);

export const ConfigModel = model<Config>('Config', configSchema);
