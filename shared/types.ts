import type { SummaryMetricsType } from '../backend/scraper/summarise-results';
import type { ReleaseCondition } from '../backend/scraper/types-azure';

export type ScrapedProject = {
  name: [collection: string, project: string];
};

export type AnalysedProjects = {
  projects: ScrapedProject[];
  lastUpdated: string;
  hasSummary: boolean;
  banner?: string;
};

export type AnalyticsItem = {
  label: string;
  start: string;
  end: string;
  pageLoads: number;
  uniques: number;
  pages: {
    pathname: string;
    count: number;
  }[];
};

export type PipelineStageStats = {
  id: number;
  name: string;
  // conditions: {
  //   type: ReleaseEnvironment['conditions'][number]['conditionType'];
  //   name: string;
  // }[];
  lastReleaseDate: Date;
  releaseCount: number;
  successCount: number;
};

export type BranchPolicies = Partial<{
  minimumNumberOfReviewers: { count: number; isOptional: boolean };
  workItemLinking: { isOptional: boolean };
  builds: { isOptional: boolean };
  commentRequirements: { isOptional: boolean };
  requireMergeStrategy: { isOptional: boolean };
}>;

export type PipelineStage = {
  name: string;
  conditions: {
    type: ReleaseCondition['conditionType'];
    name: string;
  }[];
  rank: number;
};

export type PipelineDefinitions = Record<number, PipelineStage[]>;

export type PipelineCount = {
  total: number;
  successful: number;
  name: string;
};

export type Pipeline = {
  id: number;
  name: string;
  url: string;
  repos: Record<string, {
    name: string;
    branches: string[];
    additionalBranches?: string[];
  }>;
  stageCounts: PipelineCount[];
};

export type ReleasePipelineStats = {
  pipelines: Pipeline[];
  policies: Record<string, Record<string, BranchPolicies>>;
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
  | { type: 'failed'; since: Date }
  | { type: 'unused'; since: Date | undefined };
  type: 'ui' | 'yml';
};

export type UIBuilds = null | {
  count: number;
  pipelines: UIBuildPipeline[];
};

export type UIBranchStats = {
  branches: {
    name: string;
    url: string;
    lastCommitDate: Date;
  }[];
  count: number;
  limit: number;
};

type SignificantlyAheadBranchStats = Pick<UIBranchStats, 'count' | 'limit'> & {
  branches: (UIBranchStats['branches'][0] & {
    aheadBy: number;
  })[];
};

export type UIBranches = {
  total: UIBranchStats;
  active: UIBranchStats;
  abandoned: UIBranchStats;
  deleteCandidates: UIBranchStats;
  possiblyConflicting: UIBranchStats;
  significantlyAhead: SignificantlyAheadBranchStats;
};

export type UIPullRequests = {
  total: number;
  active: number;
  abandoned: number;
  completed: number;
  timeToApprove: null | { average: string; min: string; max: string };
};

export type UITests = null | {
  name: string;
  id: number;
  url: string;
  successful: number;
  failed: number;
  executionTime: string;
  coverage: { covered: number; total: number } | null;
  testsByWeek: number[];
}[];

export type QualityGateStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export type QualityGateDetails = {
  value?: number;
  op?: 'gt' | 'lt';
  level?: number;
  status: QualityGateStatus;
};

export type UICodeQuality = null | {
  name: string;
  url: string;
  lastAnalysisDate: Date;
  qualityGateName: string;
  files?: number;
  complexity: {
    cyclomatic?: number;
    cognitive?: number;
  };
  quality: {
    gate: QualityGateStatus;
    securityRating?: QualityGateDetails;
    coverage?: QualityGateDetails;
    duplicatedLinesDensity?: QualityGateDetails;
    blockerViolations?: QualityGateDetails;
    codeSmells?: QualityGateDetails;
    criticalViolations?: QualityGateDetails;
  };
  maintainability: {
    rating?: number;
    techDebt?: number;
    codeSmells?: number;
  };
  coverage: {
    byTests?: number;
    line?: number;
    linesToCover?: number;
    uncoveredLines?: number;
    branch?: number;
    conditionsToCover?: number;
    uncoveredConditions?: number;
  };
  reliability: {
    rating?: number;
    bugs?: number;
  };
  security: {
    rating?: number;
    vulnerabilities?: number;
  };
  duplication: {
    blocks?: number;
    files?: number;
    lines?: number;
    linesDensity?: number;
  };
  oldestFoundSample: string | undefined;
  qualityGateByWeek: (QualityGateStatus | null)[];
}[];

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
  typeId: string;
  state: string;
  iterationPath: string;
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
  env?: string;
  groupId?: string;
  priority?: number;
  severity?: string;
  rca: string[];
  filterBy?: { label: string; tags: string[] }[];
};

export type UIWorkItemRevision = {
  state: string;
  date: string;
};

export type UIWorkItemType = {
  name: [string, string];
  icon: string;
  color: string;
  iconColor: string | null;
  workCenters: { label: string; startDateField: string[]; endDateField: string[]}[];
  groupLabel?: string;
  startDateFields?: string[];
  endDateFields?: string[];
  devCompleteFields?: string[];
  rootCauseFields?: string[];
};

export type AnalysedWorkItems = {
  ids: Record<number, number[] | undefined>;
  byId: Record<number, UIWorkItem>;
  types: Record<string, UIWorkItemType>;
};

export type WorkItemTimes = {
  start?: string;
  end?: string;
  devComplete?: string;
  workCenters: {
    label: string;
    start: string;
    end?: string;
  }[];
};

export type Overview = {
  byId: Record<number, UIWorkItem>;
  types: Record<string, UIWorkItemType>;
  groups: Record<string, { witId: string; name: string }>;
  times: Record<number, WorkItemTimes>;
  relations: Record<number, number[]>;
};

export type UIProjectAnalysis = {
  name: [collection: string, project: string];
  lastUpdated: string;
  reposCount: number;
  releasePipelineCount: number;
  workItemCount: number;
  workItemLabel: [singular: string, plural: string];
  banner?: string;
};

export type TestCaseAggregateStats = {
  total: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
};

export type TestCasesAnalysis = {
  automated: TestCaseAggregateStats;
  notAutomated: TestCaseAggregateStats;
};

export type ProjectRepoAnalysis = UIProjectAnalysis & {
  repos: RepoAnalysis[];
  groups?: {
    label: string;
    groups: Record<string, string[]>;
  };
};

export type ProjectReleasePipelineAnalysis = UIProjectAnalysis & ReleasePipelineStats & {
  stagesToHighlight?: string[];
  ignoreStagesBefore?: string;
  groups?: {
    label: string;
    groups: Record<string, string[]>;
  };
  environments?: string[];
};

export type ProjectWorkItemAnalysis = UIProjectAnalysis & {
  workItems: AnalysedWorkItems | null;
  taskType?: string;
};

export type ProjectOverviewAnalysis = UIProjectAnalysis & {
  overview: Overview;
  testCases: TestCasesAnalysis;
  ignoreForWIP: string[];
  environments?: string[];
};

export type SummaryMetrics = SummaryMetricsType;

export type UIChangeProgramTask = Omit<UIWorkItem, 'iterationPath' | 'typeId' | 'env' | 'groupId' | 'severity' | 'rca' | 'filterBy'> & {
  collection: string;
  team: string;
  theme: string;
};

export type UIChangeProgram = {
  lastUpdatedDate: string;
  name: string;
  changeProgramTasks: UIChangeProgramTask[];
};
