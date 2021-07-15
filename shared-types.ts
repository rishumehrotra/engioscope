export type ChildIndicator = {
  name: string;
  value: number | string;
  rating: number;
  tooltip?: string;
  additionalValue?: string;
};

export type TopLevelIndicator = {
  name: string;
  rating: number;
  count: number | string;
  indicators: ChildIndicator[];
};

export type RepoAnalysis = {
  name: string;
  id: string;
  rating: number;
  languages?: Record<string, string>;
  indicators: TopLevelIndicator[];
};

export type ProjectRepoAnalysis = {
  lastUpdated: string,
  name: [collection: string, project: string],
  repos: RepoAnalysis[]
}

export type ScrapedProject = {
  name: [collection: string, project: string];
  lastUpdated: string | null;
  rating: number | null;
};

type EnvironmentStats = {
  id: number;
  name: string;
  lastReleaseDate: Date;
  releaseCount: number;
  successCount: number
};

export type ReleaseStats = {
  id: number,
  name: string,
  description: string | null,
  stages: EnvironmentStats[],
  repos: Record<string, string[]>
};
