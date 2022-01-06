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
  name: string;
  measures: Measure[];
  lastAnalysisDate: Date;
}[];

export type SonarQualityGateDetails = {
  level: 'OK' | 'ERROR' | 'WARN';
  conditions: {
    metric: string;
    op: 'LT' | 'GT';
    error: string;
    actual: string;
    level: 'OK' | 'ERROR' | 'WARN';
  }[];
};
