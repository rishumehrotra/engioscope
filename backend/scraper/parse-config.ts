import ms from 'ms';
import { pastDate } from '../utils';

type ReleasePipelineConfig = {
  stagesToHighlight: string[];
};

type CollectionWorkItemConfig = {
  label?: string;
  getWorkItems: string[];
  groupUnder: string[];
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

export type ParsedCollectionWorkItemConfig = Readonly<{
  label: string;
  getWorkItems: string[];
  groupUnder: string[];
  skipChildren: string[];
  changeLeadTime?: {
    startDateField: string;
    endDateField: string;
  };
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
  const workitems = {
    label: config.azure.workitems?.label ?? collection.workitems?.label ?? 'Features & Bugs',
    getWorkItems: config.azure.workitems?.getWorkItems ?? collection.workitems?.getWorkItems ?? ['Feature', 'Bug'],
    groupUnder: config.azure.workitems?.groupUnder ?? collection.workitems?.groupUnder ?? ['Feature', 'Bug'],
    skipChildren: config.azure.workitems?.skipChildren ?? collection.workitems?.skipChildren ?? ['Test Case'],
    changeLeadTime: config.azure.workitems?.changeLeadTime ?? collection.workitems?.changeLeadTime
  };

  return {
    name: collection.name,
    workitems,
    projects: collection.projects.map<ParsedProjectConfig>(project => {
      if (typeof project === 'string') {
        return {
          name: project,
          releasePipelines: collection.releasePipelines ?? { stagesToHighlight: [] },
          workitems: {
            groupUnder: workitems.groupUnder,
            label: workitems.label
          }
        };
      }

      return {
        name: project.name,
        releasePipelines: project.releasePipelines ?? collection.releasePipelines ?? { stagesToHighlight: [] },
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
