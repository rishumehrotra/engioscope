import ms from 'ms';
import { pastDate } from '../utils.js';

type BranchPolicyConfiguration = Partial<{
  'Minimum number of reviewers': {
    isEnabled: boolean;
    isBlocking: boolean;
    minimumApproverCount: number;
  };
  'Comment requirements': { isEnabled: boolean; isBlocking: boolean };
  'Work item linking': { isEnabled: boolean; isBlocking: boolean };
  'Build': { isEnabled: boolean; isBlocking: boolean };
}>;

type ReleasePipelineConfig = {
  stagesToHighlight: string[];
  ignoreStagesBefore?: string;
};

type CollectionWorkItemConfig = {
  label?: string;
  getWorkItems?: string[];
  groupUnder?: string[];
  skipChildren?: string[];
  environmentField?: string;
  ignoredWorkItemsForFlowAnalysis?: string[];
  ignoreStates?: string[];
  ignoreForWIP?: string[];
  filterBy?: {
    label: string;
    field: string | string[];
    delimiter?: string;
  }[];
  types?: {
    type: string;
    groupByField?: string;
    groupLabel?: string;
    rootCause?: string | string[];
    startDate?: string | string[];
    endDate?: string | string[];
    devCompletionDate?: string | string[];
    track?: string;
    workCenters?: ({ label: string } & (
      | { startDate: string | string[] }
      | { endDate: string | string[] }
      | { startDate: string | string[]; endDate: string | string[] }
    ))[];
  }[];
};

type ChangeProgramConfig = {
  name?: string;
  workItemTypeName: string;
  teamNameField: string;
  themeNameField: string;
  startedState: string;
  doneState: string;
  ignoreStates?: string[];
  plannedStartDateField?: string;
  plannedCompletionDateField?: string;
  actualStartDateField?: string;
  actualCompletionDateField?: string;
};

type CollectionConfig = {
  name: string;
  releasePipelines?: ReleasePipelineConfig;
  workitems?: CollectionWorkItemConfig;
  changeProgram?: ChangeProgramConfig;
  environments?: string[];
  projects: (string | ProjectConfig)[];
  templateRepoName?: string;
  branchPolicies?: BranchPolicyConfiguration;
};

type ProjectConfig = {
  name: string;
  releasePipelines?: ReleasePipelineConfig;
  workitems?: CollectionWorkItemConfig;
  environments?: string[];
  templateRepoName?: string;
  groupRepos?: {
    label: string;
    groups: Record<string, string[]>;
  };
  branchPolicies?: BranchPolicyConfiguration;
};

type AzureConfig = {
  host: string;
  token: string;
  verifySsl?: boolean;
  lookAtPast: string;
  releasePipelines?: ReleasePipelineConfig;
  workitems?: CollectionWorkItemConfig;
  changeProgram?: ChangeProgramConfig;
  collections: CollectionConfig[];
  environments?: string[];
  summaryPageGroups?: ({
    collection: string;
    project: string;
    portfolioProject: string;
  } & Record<string, string>)[];
  templateRepoName?: string;
  branchPolicies?: BranchPolicyConfiguration;
} & Omit<ProjectConfig, 'name'>;

export type SonarConfig = {
  url: string;
  token: string;
  verifySsl?: boolean;
};

export type Config = Readonly<{
  port: number;
  mongoUrl: string;
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
    groupLabel?: string;
    startDate: string[];
    endDate: string[];
    devCompletionDate: string[];
    rootCause: string[];
    track?: string;
    workCenters: {
      label: string;
      startDate: string[];
      endDate: string[];
    }[];
  }[];
}>;

export type ParsedCollectionChangeProgramConfig = Readonly<{
  name: string;
  workItemTypeName: string;
  teamNameField: string;
  themeNameField: string;
  ignoreStates: string[];
  startedState: string;
  doneState: string;
  plannedStartDateField?: string;
  plannedCompletionDateField?: string;
  actualStartDateField?: string;
  actualCompletionDateField?: string;
}>;

export type ParsedProjectConfig = Readonly<{
  name: string;
  releasePipelines: ReleasePipelineConfig;
  workitems: {
    groupUnder: string[];
    label: string;
    ignoreForWIP: string[];
  };
  groupRepos?: {
    label: string;
    groups: Record<string, string[]>;
  };
  environments?: string[];
  templateRepoName?: string;
  branchPolicies: BranchPolicyConfiguration;
}>;

export type ParsedCollection = Readonly<{
  name: string;
  workitems: ParsedCollectionWorkItemConfig;
  projects: ParsedProjectConfig[];
  changeProgram: null | ParsedCollectionChangeProgramConfig;
}>;

export type ParsedConfig = Readonly<{
  port: number;
  cacheTimeMs: number;
  mongoUrl: string;
  azure: {
    host: string;
    token: string;
    verifySsl: boolean;
    queryFrom: Date;
    collections: ParsedCollection[];
    summaryPageGroups?: ({
      collection: string;
      project: string;
      portfolioProject: string;
    } & Record<string, string>)[];
  };
  sonar?: SonarConfig[];
}>;

const parseCollection =
  (config: Config) =>
  (collection: CollectionConfig): ParsedCollection => {
    const workitems: ParsedCollectionWorkItemConfig = {
      label:
        collection.workitems?.label ?? config.azure.workitems?.label ?? 'Features & Bugs',
      getWorkItems: collection.workitems?.getWorkItems ??
        config.azure.workitems?.getWorkItems ?? ['Feature', 'Bug'],
      groupUnder: collection.workitems?.groupUnder ??
        config.azure.workitems?.groupUnder ?? ['Feature', 'Bug'],
      skipChildren: collection.workitems?.skipChildren ??
        config.azure.workitems?.skipChildren ?? ['Test Case', 'Test Scenario'],
      environmentField:
        collection.workitems?.environmentField ??
        config.azure.workitems?.environmentField,
      ignoredWorkItemsForFlowAnalysis:
        collection.workitems?.ignoredWorkItemsForFlowAnalysis ??
        config.azure.workitems?.ignoredWorkItemsForFlowAnalysis,
      ignoreStates:
        collection.workitems?.ignoreStates ?? config.azure.workitems?.ignoreStates,
      filterBy: (
        collection.workitems?.filterBy ||
        config.azure.workitems?.filterBy ||
        []
      ).map(filter => ({
        label: filter.label,
        fields: Array.isArray(filter.field) ? filter.field : [filter.field],
        delimiter: filter.delimiter,
      })),
      types: (collection.workitems?.types ?? config.azure.workitems?.types)?.map(
        type => ({
          type: type.type,
          groupByField: type.groupByField,
          groupLabel: type.groupLabel,
          startDate: Array.isArray(type.startDate)
            ? type.startDate
            : [type.startDate || 'System.CreatedDate'],
          endDate: Array.isArray(type.endDate)
            ? type.endDate
            : [type.endDate || 'Microsoft.VSTS.Common.ClosedDate'],

          devCompletionDate: Array.isArray(type.devCompletionDate)
            ? type.devCompletionDate
            : type.devCompletionDate
            ? [type.devCompletionDate]
            : [],

          rootCause: Array.isArray(type.rootCause)
            ? type.rootCause
            : type.rootCause
            ? [type.rootCause]
            : [],
          track: type.track,
          workCenters: (type.workCenters || []).map(workCenter => ({
            label: workCenter.label,

            startDate:
              'startDate' in workCenter
                ? Array.isArray(workCenter.startDate)
                  ? workCenter.startDate
                  : [workCenter.startDate]
                : ['System.CreatedDate'],

            endDate:
              'endDate' in workCenter
                ? Array.isArray(workCenter.endDate)
                  ? workCenter.endDate
                  : [workCenter.endDate]
                : ['Microsoft.VSTS.Common.ClosedDate'],
          })),
        })
      ),
    };

    const changeProgram: null | ParsedCollectionChangeProgramConfig =
      collection.changeProgram || config.azure.changeProgram
        ? {
            name:
              collection.changeProgram?.name ??
              config.azure.changeProgram?.name ??
              'Change program',
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            workItemTypeName: (collection.changeProgram?.workItemTypeName ??
              config.azure.changeProgram?.workItemTypeName)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            teamNameField: (collection.changeProgram?.teamNameField ??
              config.azure.changeProgram?.teamNameField)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            themeNameField: (collection.changeProgram?.themeNameField ??
              config.azure.changeProgram?.themeNameField)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            startedState: (collection.changeProgram?.startedState ??
              config.azure.changeProgram?.startedState)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            doneState: (collection.changeProgram?.doneState ??
              config.azure.changeProgram?.doneState)!,
            ignoreStates:
              collection.changeProgram?.ignoreStates ??
              config.azure.changeProgram?.ignoreStates ??
              [],
            plannedStartDateField:
              collection.changeProgram?.plannedStartDateField ??
              config.azure.changeProgram?.plannedStartDateField,
            plannedCompletionDateField:
              collection.changeProgram?.plannedCompletionDateField ??
              config.azure.changeProgram?.plannedCompletionDateField,
            actualStartDateField:
              collection.changeProgram?.actualStartDateField ??
              config.azure.changeProgram?.actualStartDateField,
            actualCompletionDateField:
              collection.changeProgram?.actualCompletionDateField ??
              config.azure.changeProgram?.actualCompletionDateField,
          }
        : null;

    return {
      name: collection.name,
      workitems,
      changeProgram,
      projects: collection.projects.map<ParsedProjectConfig>(project => {
        if (typeof project === 'string') {
          return {
            name: project,
            releasePipelines: collection.releasePipelines ??
              config.azure.releasePipelines ?? { stagesToHighlight: [] },
            workitems: {
              groupUnder: workitems.groupUnder,
              label: workitems.label,
              ignoreForWIP:
                collection.workitems?.ignoreForWIP ??
                config.azure.workitems?.ignoreForWIP ??
                [],
            },
            environments: collection.environments ?? config.azure.environments,
            templateRepoName:
              collection.templateRepoName ?? config.azure.templateRepoName,
            branchPolicies:
              collection.branchPolicies ?? config.azure.branchPolicies ?? {},
          };
        }

        return {
          name: project.name,
          releasePipelines: project.releasePipelines ??
            collection.releasePipelines ??
            config.azure.releasePipelines ?? { stagesToHighlight: [] },
          workitems: {
            groupUnder: project.workitems?.groupUnder ?? workitems.groupUnder,
            label: project.workitems?.label ?? workitems.label,
            ignoreForWIP:
              project.workitems?.ignoreForWIP ??
              collection.workitems?.ignoreForWIP ??
              config.azure.workitems?.ignoreForWIP ??
              [],
          },
          environments:
            project.environments ?? collection.environments ?? config.azure.environments,
          groupRepos: project.groupRepos,
          templateRepoName:
            project.templateRepoName ??
            collection.templateRepoName ??
            config.azure.templateRepoName,
          branchPolicies:
            project.branchPolicies ??
            collection.branchPolicies ??
            config.azure.branchPolicies ??
            {},
        };
      }),
    };
  };

export default (config: Config): ParsedConfig => ({
  port: config.port,
  mongoUrl: config.mongoUrl,
  cacheTimeMs: ms(config.cacheToDiskFor),
  azure: {
    host: config.azure.host,
    token: config.azure.token,
    verifySsl: config.azure.verifySsl ?? true,
    queryFrom: pastDate(config.azure.lookAtPast),
    collections: config.azure.collections.map(parseCollection(config)),
    summaryPageGroups: config.azure.summaryPageGroups,
  },

  sonar: Array.isArray(config.sonar) ? config.sonar : config.sonar ? [config.sonar] : [],
});
