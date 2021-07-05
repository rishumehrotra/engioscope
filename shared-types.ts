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
  indicators: ChildIndicator[];
};

export type RepoAnalysis = {
  name: string;
  id: string;
  rating: number;
  languages?: Record<string, string>;
  indicators: TopLevelIndicator[];
};

export type ProjectAnalysis = {
  lastUpdated: string,
  name: [collection: string, project: string],
  repos: RepoAnalysis[]
}

export type ScrapedProject = {
  name: [collection: string, project: string];
  lastUpdated: string;
  rating: number;
};
