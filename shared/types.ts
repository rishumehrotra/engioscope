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
  url: string;
  description: string | null;
  stages: EnvironmentStats[];
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
  | { type: 'failed'; since: string };
};

export type UIBuilds = null | {
  count: number;
  pipelines: UIBuildPipeline[];
}

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
    url: string;
    successful: number;
    failed: number;
    executionTime: string;
    coverage: string;
  }[];
}

export type UICodeQuality = null | {
  complexity: number;
  bugs: number;
  codeSmells: number;
  vulnerabilities: number;
  duplication: number;
  techDebt: string;
  qualityGate: 'error' | 'warn' | 'ok';
}

export type RepoAnalysis = {
  name: string;
  id: string;
  url: string;
  languages?: { lang: string; loc: number; color: string }[];
  commits: number;
  builds: UIBuilds;
  branches: UIBranches;
  prs: UIPullRequests;
  tests: UITests;
  codeQuality: UICodeQuality;
};

export type ProjectRepoAnalysis = {
  lastUpdated: string;
  name: [collection: string, project: string];
  repos: RepoAnalysis[];
}
