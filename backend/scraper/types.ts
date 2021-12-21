import type {
  AnalysedWorkItems, Overview, ReleasePipelineStats, RepoAnalysis
} from '../../shared/types';

export type WorkItemAnalysis = {
  analysedWorkItems: AnalysedWorkItems | null;
  overview: Overview;
};

export type ProjectAnalysis = {
  repoAnalysis: RepoAnalysis[];
  releaseAnalysis: ReleasePipelineStats;
  workItemAnalysis: WorkItemAnalysis;
  workItemLabel: string;
};
