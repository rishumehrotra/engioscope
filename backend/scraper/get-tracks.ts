import type { TrackwiseData, UIWorkItemType, WorkItemTimes } from '../../shared/types';
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

  const allWorkItemTypes = results
    .map(r => r.analysisResult.workItemAnalysis.overview.types)
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});

  const workItemTypes = [
    ...workItemsWithTracks
      .reduce((acc, workItem) => {
        acc.add(workItem.typeId);
        return acc;
      }, new Set<string>())
  ].reduce<Record<string, UIWorkItemType>>((acc, curr) => ({ ...acc, [curr]: allWorkItemTypes[curr] }), {});

  const allGroups = results
    .map(r => r.analysisResult.workItemAnalysis.overview.groups)
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});

  const groups = [
    ...workItemsWithTracks
      .reduce((acc, workItem) => {
        if (workItem.groupId) acc.add(workItem.groupId);
        return acc;
      }, new Set<string>())
  ].reduce<Record<string, {
    witId: string;
    name: string;
  }>>((acc, curr) => ({ ...acc, [curr]: allGroups[curr] }), {});

  return {
    workItems: workItemsWithTracks, times: workItemTimes, types: workItemTypes, groups
  };
};

export default byTrack;
