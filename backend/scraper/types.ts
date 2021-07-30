import { ReleasePipelineStats, RepoAnalysis } from '../../shared/types';

export type Config = Readonly<{
  repoType: 'azure';
  host: string;
  token: string;
  lookAtPast: string;
  cacheToDiskFor: string;
  port: number;
  stagesToHighlight?: string[];
  projects: [collectionName: string, projectName: string][];
  sonar: { url: string; token: string }[];
}>;

export type ProjectAnalysis = {
  repoAnalysis: RepoAnalysis[];
  releaseAnalysis: ReleasePipelineStats[];
}
