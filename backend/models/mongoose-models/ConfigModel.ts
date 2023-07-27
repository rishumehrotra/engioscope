import { model, Schema } from 'mongoose';

type WorkCenter = {
  label: string;
  startStates?: string[];
  endStates?: string[];
};

const workCenterSchema = new Schema<WorkCenter>({
  label: { type: String, required: true },
  startStates: {
    type: [String],
    default: undefined,
  },
  endStates: {
    type: [String],
    default: undefined,
  },
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
  type: { type: String, required: true },
  groupByField: String,
  startStates: {
    type: [String],
    default: undefined,
  },
  endStates: {
    type: [String],
    default: undefined,
  },
  rootCause: {
    type: [String],
    default: undefined,
  },
  devCompletionStates: {
    type: [String],
    default: undefined,
  },
  ignoreStates: {
    type: [String],
    default: undefined,
  },
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
  label: {
    type: String,
    required: true,
  },
  field: {
    type: [String],
    required: true,
  },
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
    collectionName: { type: String, default: null },
    project: { type: String, default: null },
    filterBy: {
      type: [filterBySchema],
      default: undefined,
    },
    environments: {
      type: [String],
      default: undefined,
    },
    templateRepoName: String,
    workItemsConfig: {
      type: [workItemsConfigSchema],
      default: undefined,
    },
  },
  { timestamps: true }
);

export const ConfigModel = model<Config>('Config', configSchema);
