import type {
  ProjectWorkItemAnalysis,
  UIWorkItemRevision,
  ProjectOverviewAnalysis,
  SummaryMetrics,
  UIChangeProgram,
  TrackFlowMetrics,
  TrackFeatures,
} from '../shared/types.js';

const json = (res: Response) => res.json();

export const workItemMetrics = (
  collection: string,
  project: string
): Promise<ProjectWorkItemAnalysis> =>
  fetch(`/api/${collection}/${project}/work-items.json`).then(json);

export const workItemRevisions = (
  collection: string,
  ids: number[]
): Promise<Record<number, UIWorkItemRevision[]>> =>
  fetch(`/api/${collection}/work-item-revisions?ids=${ids.join(',')}`).then(json);

export const overview = (
  collection: string,
  project: string
): Promise<ProjectOverviewAnalysis> =>
  fetch(`/api/${collection}/${project}/overview.json`).then(json);

export const metricsSummary = (): Promise<SummaryMetrics> =>
  fetch('/api/summary-metrics.json').then(json);

export const changeProgramDetails = (): Promise<UIChangeProgram> =>
  fetch('/api/change-program.json').then(json);

export const fetchTrackFlowMetrics = (): Promise<TrackFlowMetrics> =>
  fetch('/api/track-flow-metrics.json').then(json);

export const fetchTrackFeatures = (): Promise<TrackFeatures> =>
  fetch('/api/track-features.json').then(json);
