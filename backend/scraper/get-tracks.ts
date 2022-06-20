import type { TrackwiseData, WorkItemTimes } from '../../shared/types';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config';
import type { ProjectAnalysis } from './types';

type Result = {
  collectionConfig: ParsedCollection;
  projectConfig: ParsedProjectConfig;
  analysisResult: ProjectAnalysis;
};

const byTrack = (config: ParsedConfig, results: Result[]): TrackwiseData => {
  const workItemsWithTracks = Object.values(
    results
      .map(r => r.analysisResult.workItemAnalysis.overview)
      .map(wis => wis.byId)
      .reduce((acc, curr) => ({ ...acc, ...curr }), {})
  ).filter(wi => wi.track);

  const times = results
    .map(r => r.analysisResult.workItemAnalysis.overview)
    .map(wis => wis.times)
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});

  const workItemTimes = workItemsWithTracks
    .reduce<Record<number, WorkItemTimes>>((acc, workItem) => {
      acc[workItem.id] = times[workItem.id];
      return acc;
    }, {});

  return { workItems: workItemsWithTracks, times: workItemTimes };
};

export default byTrack;
