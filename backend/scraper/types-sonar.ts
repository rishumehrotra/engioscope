export type Measure = {
  metric: string;
  value: string;
};

export type CodeQuality = {
  id: string;
  key: string;
  name: string;
  description: string;
  qualifier: string;
  measures: Measure[];
};

export type SonarAnalysisByRepo = null | {
  url: string;
  measures: Measure[];
  lastAnalysisDate: Date;
};
