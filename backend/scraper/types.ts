import type {
  AnalysedWorkItems, Overview, ReleasePipelineStats, RepoAnalysis, TestCasesAnalysis
} from '../../shared/types.js';

export type WorkItemAnalysis = {
  analysedWorkItems: AnalysedWorkItems | null;
  overview: Overview;
};

export type ProjectAnalysis = {
  repoAnalysis: RepoAnalysis[];
  releaseAnalysis: ReleasePipelineStats;
  workItemAnalysis: WorkItemAnalysis;
  workItemLabel: string;
  testCasesAnalysis: TestCasesAnalysis;
};
