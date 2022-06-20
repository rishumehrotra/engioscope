import { exists } from '../../shared/utils';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config';
import type { ProjectAnalysis } from './types';

type Result = {
  collectionConfig: ParsedCollection;
  projectConfig: ParsedProjectConfig;
  analysisResult: ProjectAnalysis;
};

const byTrack = (config: ParsedConfig, results: Result[]) => (
  results
    .map(r => r.analysisResult.workItemAnalysis.analysedWorkItems)
    .filter(exists)
    .map(wis => Object.values(wis.byId))
    .flat()
    .filter(wi => wi.track)
);

export default byTrack;
