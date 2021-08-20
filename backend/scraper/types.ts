import type { AnalysedWorkItems, ReleasePipelineStats, RepoAnalysis } from '../../shared/types';

export type ProjectConfig = {
  name: string;
  releasePipelines?: {
    stagesToHighlight?: string[];
  };
  workitems?: {
    groupUnder: string;
    label?: string;
    skipChildren?: string[];
    changeLeadTime?: {
      startDateField: string;
      endDateField: string;
    };
  };
};

export type Config = Readonly<{
  port: number;
  cacheToDiskFor: string;
  azure: {
    host: string;
    token: string;
    lookAtPast: string;
    collections: {
      name: string;
      projects: (string | ProjectConfig)[];
    }[];
  } & Omit<ProjectConfig, 'name'>;
  sonar: { url: string; token: string }[];
}>;

export type ProjectAnalysis = {
  repoAnalysis: RepoAnalysis[];
  releaseAnalysis: ReleasePipelineStats[];
  workItemAnalysis: AnalysedWorkItems | null;
  workItemLabel: string;
};
