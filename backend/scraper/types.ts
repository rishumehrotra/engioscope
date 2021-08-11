import { AnalysedWorkItems, ReleasePipelineStats, RepoAnalysis } from '../../shared/types';

export type Config = Readonly<{
  port: number;
  cacheToDiskFor: string;
  azure: {
    host: string;
    token: string;
    lookAtPast: string;
    stagesToHighlight?: string[];
    groupWorkItemsUnder?: string;
    collections: {
      name: string;
      projects: string[];
    }[];
  };
  sonar: { url: string; token: string }[];
}>;

export type ProjectAnalysis = {
  repoAnalysis: RepoAnalysis[];
  releaseAnalysis: ReleasePipelineStats[];
  workItemAnalysis: AnalysedWorkItems | null;
}
