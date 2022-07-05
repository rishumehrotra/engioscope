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

export type SonarQualityGate = 'OK' | 'ERROR' | 'WARN';

export type SonarAnalysisByRepo = null | {
  url: string;
  name: string;
  measures: Measure[];
  lastAnalysisDate: Date | null;
  qualityGateName: string;
  qualityGateHistory: { date: Date; value: SonarQualityGate }[];
}[];

export type SonarQualityGateDetails = {
  level: SonarQualityGate;
  conditions?: {
    metric: string;
    op: 'LT' | 'GT';
    error: string;
    actual: string;
    level: SonarQualityGate;
  }[];
};
