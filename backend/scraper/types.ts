import type { AnalysedWorkItems, ReleasePipelineStats, RepoAnalysis } from '../../shared/types';

export type ProjectAnalysis = {
  repoAnalysis: RepoAnalysis[];
  releaseAnalysis: ReleasePipelineStats[];
  workItemAnalysis: AnalysedWorkItems | null;
  workItemLabel: string;
};
