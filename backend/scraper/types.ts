import type { AnalysedWorkItems, ReleasePipelineStats, RepoAnalysis } from '../../shared/types';

export type Config = Readonly<{
  port: number;
  cacheToDiskFor: string;
  azure: {
    host: string;
    token: string;
    lookAtPast: string;
    stagesToHighlight?: string[];
    workitems?: {
      groupUnder: string;
      label?: string;
      skipChildren?: string[];
    };
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
  workItemLabel: string;
};
