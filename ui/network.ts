import type {
  ProjectReleasePipelineAnalysis,
  ProjectRepoAnalysis,
  ProjectWorkItemAnalysis,
  UIWorkItemRevision,
  ProjectOverviewAnalysis,
  AnalyticsItem,
  PipelineDefinitions,
  SummaryMetrics,
  AnalysedProjects,
  UIChangeProgram,
  TrackFlowMetrics,
  TrackFeatures,
} from '../shared/types.js';

const json = (res: Response) => res.json();

export const fetchCollections = (): Promise<AnalysedProjects> =>
  fetch('/api/index.json').then(json);

export const fetchAnalytics = (): Promise<AnalyticsItem[]> => fetch('/api/an').then(json);

export const repoMetrics = (
  collection: string,
  project: string
): Promise<ProjectRepoAnalysis> =>
  fetch(`/api/${collection}/${project}/repos.json`).then(json);

export const pipelineMetrics = (
  collection: string,
  project: string
): Promise<ProjectReleasePipelineAnalysis> =>
  fetch(`/api/${collection}/${project}/releases.json`).then(json);

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

export const releaseDefinitions = (
  collection: string,
  project: string,
  definitionIds: number[]
): Promise<PipelineDefinitions> =>
  fetch(
    `/api/${collection}/${project}/release-definitions?ids=${definitionIds.join(',')}`
  ).then(json);

export const metricsSummary = (): Promise<SummaryMetrics> =>
  fetch('/api/summary-metrics.json').then(json);

export const changeProgramDetails = (): Promise<UIChangeProgram> =>
  fetch('/api/change-program.json').then(json);

export const fetchTrackFlowMetrics = (): Promise<TrackFlowMetrics> =>
  fetch('/api/track-flow-metrics.json').then(json);

export const fetchTrackFeatures = (): Promise<TrackFeatures> =>
  fetch('/api/track-features.json').then(json);
