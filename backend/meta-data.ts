import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lock } from './utils.js';

const [acquireLock, releaseLock] = lock();

type Project = {
  name: string;
  lastBuildUpdateDate?: Date;
};

type Collection = {
  name: string;
  projects: Project[];
};

export type MetaData = {
  collections: Collection[];
};

const metaDataFilePath = join(process.cwd(), 'meta-data.json');

const loadMetaData = () => (
  readFile(metaDataFilePath, 'utf8')
    .then((m): MetaData => {
      const parsed = JSON.parse(m) as MetaData;
      return {
        ...parsed,
        collections: parsed.collections.map(c => ({
          ...c,
          projects: c.projects.map(p => ({
            ...p,
            lastBuildUpdateDate: p.lastBuildUpdateDate
              ? new Date(p.lastBuildUpdateDate)
              : undefined
          }))
        }))
      };
    })
    .catch(() => ({ collections: [] }) as MetaData)
);

const saveMetaData = (metadata: MetaData) => (
  writeFile(metaDataFilePath, JSON.stringify(metadata))
);

export const getAllMetaData = loadMetaData;

const getProject = (collection: string, project: string) => (
  loadMetaData()
    .then(metadata => (
      metadata
        .collections
        .find(c => c.name === collection))
      ?.projects
      .find(p => p.name === project))
);

const modifyProject = (collection: string, project: string, modifier: (proj: Project) => void) => (
  acquireLock()
    .then(loadMetaData)
    .then(metadata => {
      let col = metadata
        .collections
        .find(c => c.name === collection);

      if (!col) {
        col = { name: collection, projects: [] };
        metadata.collections.push(col);
      }

      let proj = col.projects.find(p => p.name === project);
      if (!proj) {
        proj = { name: project };
        col.projects.push(proj);
      }

      modifier(proj);
      return saveMetaData(metadata);
    })
    .finally(releaseLock)
);

export const setLastBuildUpdateDate = (collection: string, project: string) => (
  modifyProject(collection, project, proj => { proj.lastBuildUpdateDate = new Date(); })
);

export const getLastBuildUpdateDate = (collection: string, project: string) => (
  getProject(collection, project)
    .then(p => (
      p?.lastBuildUpdateDate
        ? new Date(p.lastBuildUpdateDate)
        : undefined
    ))
);
