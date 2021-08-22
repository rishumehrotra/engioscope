type ReleasePipelineConfig = {
  stagesToHighlight: string[];
};

type CollectionWorkItemConfig = {
  groupUnder: string;
  label?: string;
  skipChildren?: string[];
  changeLeadTime?: {
    startDateField: string;
    endDateField: string;
  };
};

type CollectionConfig = {
  name: string;
  releasePipelines?: ReleasePipelineConfig;
  workitems?: CollectionWorkItemConfig;
  projects: (string | ProjectConfig)[];
};

// type ProjectWorkItemConfig = Pick<
//   CollectionWorkItemConfig, 'groupUnder' | 'label' | 'changeLeadTime'
// >;

export type ProjectConfig = {
  name: string;
  releasePipelines?: ReleasePipelineConfig;
  workitems?: CollectionWorkItemConfig;
};

type AzureConfig = {
  host: string;
  token: string;
  lookAtPast: string;
  releasePipelines?: ReleasePipelineConfig;
  workitems?: CollectionWorkItemConfig;
  collections: CollectionConfig[];
} & Omit<ProjectConfig, 'name'>;

type SonarConfig = {
  url: string;
  token: string;
};

export type Config = Readonly<{
  port: number;
  cacheToDiskFor: string;
  azure: AzureConfig;
  sonar: SonarConfig[];
}>;
