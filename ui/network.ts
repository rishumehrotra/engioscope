import {
  ProjectReleasePipelineAnalysis, ProjectRepoAnalysis,
  ScrapedProject, ProjectWorkItemAnalysis
} from '../shared/types';

const json = (res: Response) => res.json();

export const fetchCollections = (): Promise<ScrapedProject[]> => (
  fetch('/api/index.json').then(json)
);

export const fetchProjectMetrics = (collection: string, project: string): Promise<ProjectRepoAnalysis> => (
  fetch(`/api/${collection}_${project}.json`).then(json)
);

export const fetchProjectReleaseMetrics = (collection: string, project: string): Promise<ProjectReleasePipelineAnalysis> => (
  fetch(`/api/${collection}_${project}_releases.json`).then(json)
);

export const fetchProjectWorkItemAnalysis = (collection: string, project: string): Promise<ProjectWorkItemAnalysis> => (
  fetch(`/api/${collection}_${project}_work-items.json`).then(json)
);
