export type ScrapedProject = {
  name: [collection: string, project: string];
  lastUpdated: string | null;
};

export type PipelineStageStats = {
  id: number;
  name: string;
  lastReleaseDate: Date;
  releaseCount: number;
  successCount: number;
};

export type ReleasePipelineStats = {
  id: number;
  name: string;
  url: string;
  description: string | null;
  stages: PipelineStageStats[];
  repos: Record<string, string[]>;
};

export type UIBuildPipeline = {
  count: number;
  success: number;
  name: string;
  url: string;
  duration: { average: string; min: string; max: string };
  definitionId: string;
  status:
  | { type: 'unknown' }
  | { type: 'succeeded' }
  | { type: 'failed'; since: Date };
};

export type UIBuilds = null | {
  count: number;
  pipelines: UIBuildPipeline[];
};

export type UIBranches = {
  total: number;
  active: number;
  abandoned: number;
  deleteCandidates: number;
  possiblyConflicting: number;
  significantlyAhead: {
    limit: number;
    branches: {
      name: string;
      url: string;
      aheadBy: number;
      lastCommitDate: Date;
    }[];
  };
};

export type UIPullRequests = {
  total: number;
  active: number;
  abandoned: number;
  completed: number;
  timeToApprove: null | { average: string; min: string; max: string };
};

export type UITests = null | {
  total: number;
  pipelines: {
    name: string;
    url: string;
    successful: number;
    failed: number;
    executionTime: string;
    coverage: string;
  }[];
};

export type UICodeQuality = null | {
  url: string;
  complexity: number;
  bugs: number;
  codeSmells: number;
  vulnerabilities: number;
  duplication: number;
  techDebt: number;
  qualityGate: 'error' | 'warn' | 'ok';
};

export type AggregatedCommitsByDev = {
  name: string;
  imageUrl: string;
  changes: {
    add: number;
    edit: number;
    delete: number;
  };
  byDate: Record<string, number>;
};

export type UICommits = {
  count: number;
  byDev: AggregatedCommitsByDev[];
};

export type RepoAnalysis = {
  name: string;
  id: string;
  url: string;
  defaultBranch?: string;
  languages?: { lang: string; loc: number; color: string }[];
  commits: UICommits;
  builds: UIBuilds;
  branches: UIBranches;
  prs: UIPullRequests;
  tests: UITests;
  codeQuality: UICodeQuality;
  pipelineCount?: number;
};

export type UIWorkItem = {
  id: number;
  project: string;
  type: string;
  state: string;
  created: {
    // name: string;
    on: string;
    // pic: string;
  };
  updated: {
    on: string;
  };
  // assigned: {
  // name: string;
  // pic: string;
  // };
  title: string;
  // description: string;
  url: string;
  icon: string;
  color: string;
  env?: string;
  clt?: { start?: string; end?: string };
  cycleTime: { start: string; end?: string };
};

export type UIWorkItemRevision = {
  state: string;
  date: string;
};

export type AnalysedWorkItems = {
  ids: Record<number, number[] | undefined>;
  byId: Record<number, UIWorkItem>;
};

export type UIProjectAnalysis = {
  name: [collection: string, project: string];
  lastUpdated: string;
  reposCount: number;
  releasePipelineCount: number;
  workItemCount: number;
  workItemLabel: [singular: string, plural: string];
};

export type ProjectRepoAnalysis = UIProjectAnalysis & { repos: RepoAnalysis[] };

export type ProjectReleasePipelineAnalysis = UIProjectAnalysis & {
  pipelines: ReleasePipelineStats[];
  stagesToHighlight?: string[];
};

export type ProjectWorkItemAnalysis = UIProjectAnalysis & {
  workItems: AnalysedWorkItems | null;
  taskType?: string;
};
