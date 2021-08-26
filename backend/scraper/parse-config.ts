import ms from 'ms';
import { pastDate } from '../utils';

type ReleasePipelineConfig = {
  stagesToHighlight: string[];
};

type CLTDefinition = {
  whenMatchesField?: {
    field: string;
    value: string;
  }[];
  startDateField: string[];
  endDateField: string[];
};

type WorkItemType = string;

type CollectionWorkItemConfig = {
  label?: string;
  getWorkItems: string[];
  groupUnder: string[];
  skipChildren?: string[];
  environmentField?: string;
  changeLeadTime?: Record<WorkItemType, CLTDefinition>;
};

type CollectionConfig = {
  name: string;
  releasePipelines?: ReleasePipelineConfig;
  workitems?: CollectionWorkItemConfig;
  projects: (string | ProjectConfig)[];
};

type ProjectConfig = {
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

export type SonarConfig = {
  url: string;
  token: string;
};

type Config = Readonly<{
  port: number;
  cacheToDiskFor: string;
  azure: AzureConfig;
  sonar?: SonarConfig | SonarConfig[];
}>;

export type ParsedCLTDefinition = {
  whenMatchesField?: {
    field: string;
    value: string;
  }[];
  startDateField: string[];
  endDateField: string[];
};

export type ParsedCollectionWorkItemConfig = Readonly<{
  label: string;
  getWorkItems: string[];
  groupUnder: string[];
  skipChildren: string[];
  environmentField?: string;
  changeLeadTime?: Record<WorkItemType, ParsedCLTDefinition>;
}>;

export type ParsedProjectConfig = Readonly<{
  name: string;
  releasePipelines: ReleasePipelineConfig;
  workitems: {
    groupUnder: string[];
    label: string;
  };
}>;

export type ParsedCollection = Readonly<{
  name: string;
  workitems: ParsedCollectionWorkItemConfig;
  projects: ParsedProjectConfig[];
}>;

export type ParsedConfig = Readonly<{
  port: number;
  cacheTimeMs: number;
  azure: {
    host: string;
    token: string;
    queryFrom: Date;
    collections: ParsedCollection[];
  };
  sonar?: SonarConfig[];
}>;

const parseCollection = (config: Config) => (collection: CollectionConfig): ParsedCollection => {
  const workitems: ParsedCollectionWorkItemConfig = {
    label: collection.workitems?.label ?? config.azure.workitems?.label ?? 'Features & Bugs',
    getWorkItems: collection.workitems?.getWorkItems ?? config.azure.workitems?.getWorkItems ?? ['Feature', 'Bug'],
    groupUnder: collection.workitems?.groupUnder ?? config.azure.workitems?.groupUnder ?? ['Feature', 'Bug'],
    skipChildren: collection.workitems?.skipChildren ?? config.azure.workitems?.skipChildren ?? ['Test Case', 'Test Scenario'],
    environmentField: collection.workitems?.environmentField ?? config.azure.workitems?.environmentField,
    changeLeadTime: collection.workitems?.changeLeadTime ?? config.azure.workitems?.changeLeadTime
  };

  return {
    name: collection.name,
    workitems,
    projects: collection.projects.map<ParsedProjectConfig>(project => {
      if (typeof project === 'string') {
        return {
          name: project,
          releasePipelines: collection.releasePipelines
            ?? config.azure.releasePipelines
            ?? { stagesToHighlight: [] },
          workitems: {
            groupUnder: workitems.groupUnder,
            label: workitems.label
          }
        };
      }

      return {
        name: project.name,
        releasePipelines: project.releasePipelines
          ?? collection.releasePipelines
          ?? config.azure.releasePipelines
          ?? { stagesToHighlight: [] },
        workitems: {
          groupUnder: project.workitems?.groupUnder ?? workitems.groupUnder,
          label: project.workitems?.label ?? workitems.label
        }
      };
    })
  };
};

export default (config: Config): ParsedConfig => ({
  port: config.port,
  cacheTimeMs: ms(config.cacheToDiskFor),
  azure: {
    host: config.azure.host,
    token: config.azure.token,
    queryFrom: pastDate(config.azure.lookAtPast),
    collections: config.azure.collections.map(parseCollection(config))
  },
  // eslint-disable-next-line no-nested-ternary
  sonar: Array.isArray(config.sonar)
    ? config.sonar
    : (config.sonar ? [config.sonar] : [])
});
