import ms from 'ms';
import { pastDate } from '../utils';

type ReleasePipelineConfig = {
  stagesToHighlight: string[];
  ignoreStagesBefore?: string;
};

type CollectionWorkItemConfig = {
  label?: string;
  getWorkItems: string[];
  groupUnder: string[];
  skipChildren?: string[];
  environmentField?: string;
  ignoredWorkItemsForFlowAnalysis?: string[];
  ignoreStates?: string[];
  filterBy?: {
    label: string;
    field: string | string[];
    delimiter?: string;
  }[];
  types?: {
    type: string;
    groupByField?: string;
    groupLabel?: string;
    rootCause?: string;
    startDate: string | string[];
    endDate?: string | string[];
    devCompletionDate?: string | string[];
    workCenters?: ({ label: string } & (
      { startDate: string | string[] }
      | { endDate: string | string[] }
      | { startDate: string | string[]; endDate: string | string[] }
    ))[];
  }[];
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
  groupRepos?: {
    label: string;
    groups: Record<string, string[]>;
  };
};

type AzureConfig = {
  host: string;
  token: string;
  lookAtPast: string;
  releasePipelines?: ReleasePipelineConfig;
  workitems?: CollectionWorkItemConfig;
  collections: CollectionConfig[];
  summaryPageGroups?: ({
    collection: string;
    project: string;
  } & Record<string, string>)[];
} & Omit<ProjectConfig, 'name'>;

export type SonarConfig = {
  url: string;
  token: string;
};

export type Config = Readonly<{
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
  ignoredWorkItemsForFlowAnalysis?: string[];
  ignoreStates?: string[];
  filterBy?: {
    label: string;
    fields: string[];
    delimiter?: string;
  }[];
  types?: {
    type: string;
    groupByField?: string;
    groupLabel: string;
    startDate: string[];
    endDate: string[];
    devCompletionDate: string[];
    rootCause?: string;
    workCenters: {
      label: string;
      startDate: string[];
      endDate: string[];
    }[];
  }[];
}>;

export type ParsedProjectConfig = Readonly<{
  name: string;
  releasePipelines: ReleasePipelineConfig;
  workitems: {
    groupUnder: string[];
    label: string;
  };
  groupRepos?: {
    label: string;
    groups: Record<string, string[]>;
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
    summaryPageGroups?: ({
      collection: string;
      project: string;
    } & Record<string, string>)[];
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
    ignoredWorkItemsForFlowAnalysis: collection.workitems?.ignoredWorkItemsForFlowAnalysis
      ?? config.azure.workitems?.ignoredWorkItemsForFlowAnalysis,
    ignoreStates: collection.workitems?.ignoreStates ?? config.azure.workitems?.ignoreStates,
    filterBy: (collection.workitems?.filterBy || config.azure.workitems?.filterBy || []).map(filter => ({
      label: filter.label,
      fields: Array.isArray(filter.field) ? filter.field : [filter.field],
      delimiter: filter.delimiter
    })),
    types: (collection.workitems?.types ?? config.azure.workitems?.types)?.map(type => ({
      type: type.type,
      groupByField: type.groupByField,
      groupLabel: type.groupLabel || 'Unlabelled group',
      startDate: Array.isArray(type.startDate) ? type.startDate : [type.startDate || 'System.CreatedDate'],
      endDate: Array.isArray(type.endDate) ? type.endDate : [type.endDate || 'Microsoft.VSTS.Common.ClosedDate'],
      // eslint-disable-next-line no-nested-ternary
      devCompletionDate: Array.isArray(type.devCompletionDate)
        ? type.devCompletionDate
        : (type.devCompletionDate ? [type.devCompletionDate] : []),
      rootCause: type.rootCause,
      workCenters: (type.workCenters || []).map(workCenter => ({
        label: workCenter.label,
        // eslint-disable-next-line no-nested-ternary
        startDate: 'startDate' in workCenter
          ? (Array.isArray(workCenter.startDate) ? workCenter.startDate : [workCenter.startDate])
          : ['System.CreatedDate'],
        // eslint-disable-next-line no-nested-ternary
        endDate: 'endDate' in workCenter
          ? (Array.isArray(workCenter.endDate) ? workCenter.endDate : [workCenter.endDate])
          : ['Microsoft.VSTS.Common.ClosedDate']
      }))
    }))
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
        },
        groupRepos: project.groupRepos
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
    collections: config.azure.collections.map(parseCollection(config)),
    summaryPageGroups: config.azure.summaryPageGroups
  },
  // eslint-disable-next-line no-nested-ternary
  sonar: Array.isArray(config.sonar)
    ? config.sonar
    : (config.sonar ? [config.sonar] : [])
});
