const json = (res: Response) => res.json();

export const fetchCollections = () => fetch('/api/index.json').then(json);

export const fetchProjectMetrics = (collection: string, project: string) => (
  fetch(`/api/${collection}_${project}.json`).then(json)
);

export const fetchProjectReleaseMetrics = (collection: string, project: string) => (
  fetch(`/api/${collection}_${project}_releases.json`).then(json)
);
