const json = (res: Response) => res.json();

export const getCollections = () => fetch('/api/index.json').then(json);

export const getProjectMetrics = (collection: string, project: string) => (
  fetch(`/api/${collection}_${project}.json`).then(json)
);

export const getProjectReleaseMetrics = (collection: string, project: string) => (
  fetch(`/api/${collection}_${project}_releases.json`).then(json)
);
