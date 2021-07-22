export type ChildIndicator = {
  name: string;
  value: number | string;
  tooltip?: string;
  additionalValue?: string;
};

export type TopLevelIndicator = {
  name: string;
  count: number | string;
  indicators: ChildIndicator[];
};

export type RepoAnalysis = {
  name: string;
  id: string;
  languages?: Record<string, string>;
  builds: UIBuilds;
  branches: UIBranches;
  prs: UIPullRequests;
  tests: UITests;
  indicators: TopLevelIndicator[];
};

export type ProjectRepoAnalysis = {
  lastUpdated: string;
  name: [collection: string, project: string];
  repos: RepoAnalysis[];
}

export type ScrapedProject = {
  name: [collection: string, project: string];
  lastUpdated: string | null;
};

type EnvironmentStats = {
  id: number;
  name: string;
  lastReleaseDate: Date;
  releaseCount: number;
  successCount: number;
};

export type ReleaseStats = {
  id: number;
  name: string;
  description: string | null;
  stages: EnvironmentStats[];
  repos: Record<string, string[]>;
};

export type UIBuilds = null | {
  count: number;
  success: number;
  duration: { average: string; min: string; max: string };
  status:
  | { type: 'unknown' }
  | { type: 'succeeded' }
  | { type: 'failed'; since: string };
};

export type UIBranches = {
  total: number;
  active: number;
  abandoned: number;
  deleteCandidates: number;
  possiblyConflicting: number;
}

export type UIPullRequests = {
  total: number;
  active: number;
  abandoned: number;
  completed: number;
  timeToApprove: null | { average: string; min: string; max: string };
}

export type UITests = null | {
  total: number;
  pipelines: {
    name: string;
    successful: number;
    failed: number;
    executionTime: string;
    coverage: string;
  }[];
}
