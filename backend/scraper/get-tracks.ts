import { mergeLeft, prop } from 'rambda';
import type {
  TrackwiseData, UIWorkItemType, WorkItemTimes, Overview
} from '../../shared/types.js';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config.js';
import type { ProjectAnalysis } from './types.js';

type Result = {
  collectionConfig: ParsedCollection;
  projectConfig: ParsedProjectConfig;
  analysisResult: ProjectAnalysis;
};

const overview = (result: Result) => result.analysisResult.workItemAnalysis.overview;
const mergeProp = (results: Result[]) => <T extends keyof Overview>(propName: T): Overview[T] => (
  results
    .map(overview)
    .map(prop(propName))
    .reduce(mergeLeft, {})
);

const byTrack = (config: ParsedConfig, results: Result[]): TrackwiseData => {
  const resultsBy = mergeProp(results);
  const workItemsWithTracks = Object.values(resultsBy('byId')).filter(prop('track'));

  const times = resultsBy('times');

  const workItemTimes = workItemsWithTracks
    .reduce<Record<number, WorkItemTimes>>((acc, workItem) => {
      acc[workItem.id] = times[workItem.id];
      return acc;
    }, {});

  const allWorkItemTypes = resultsBy('types');

  const workItemTypes = [
    ...workItemsWithTracks
      .reduce((acc, workItem) => {
        acc.add(workItem.typeId);
        return acc;
      }, new Set<string>())
  ].reduce<Record<string, UIWorkItemType>>(
    (acc, curr) => ({ ...acc, [curr]: allWorkItemTypes[curr] }),
    {}
  );

  const allGroups = resultsBy('groups');

  const groups = [
    ...workItemsWithTracks
      .reduce((acc, workItem) => {
        if (workItem.groupId) acc.add(workItem.groupId);
        return acc;
      }, new Set<string>())
  ].reduce<Record<string, { witId: string; name: string}>>(
    (acc, curr) => ({ ...acc, [curr]: allGroups[curr] }),
    {}
  );

  return {
    workItems: workItemsWithTracks, times: workItemTimes, types: workItemTypes, groups
  };
};

export default byTrack;
