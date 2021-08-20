import type {
  ProjectReleasePipelineAnalysis, ProjectRepoAnalysis,
  ScrapedProject, ProjectWorkItemAnalysis, UIWorkItemRevision
} from '../shared/types';

const json = (res: Response) => res.json();

export const fetchCollections = (): Promise<ScrapedProject[]> => (
  fetch('/api/index.json').then(json)
);

export const repoMetrics = (collection: string, project: string): Promise<ProjectRepoAnalysis> => (
  fetch(`/api/${collection}_${project}.json`).then(json)
);

export const pipelineMetrics = (collection: string, project: string): Promise<ProjectReleasePipelineAnalysis> => (
  fetch(`/api/${collection}_${project}_releases.json`).then(json)
);

export const workItemMetrics = (collection: string, project: string): Promise<ProjectWorkItemAnalysis> => (
  fetch(`/api/${collection}_${project}_work-items.json`).then(json)
);

export const workItemRevisions = (collection: string, ids: number[]): Promise<Record<number, UIWorkItemRevision[]>> => (
  fetch(`/api/${collection}/work-item-revisions?ids=${ids.join(',')}`).then(json)
);
