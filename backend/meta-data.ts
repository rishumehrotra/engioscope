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
  workItemUpdateDate?: Date;
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
          workItemUpdateDate: c.workItemUpdateDate
            ? new Date(c.workItemUpdateDate)
            : undefined,
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

const getCollection = async (collection: string) => (
  (await loadMetaData()).collections.find(c => c.name === collection)
);

const modifyCollection = async (collection: string, modifier: (coll: Collection) => void) => {
  acquireLock()
    .then(loadMetaData)
    .then(metadata => {
      let col = metadata.collections.find(c => c.name === collection);
      if (!col) {
        col = { name: collection, projects: [] };
        metadata.collections.push(col);
      }

      modifier(col);
      return saveMetaData(metadata);
    })
    .finally(releaseLock);
};

const getProject = async (collection: string, project: string) => (
  (await getCollection(collection))?.projects.find(p => p.name === project)
);

const modifyProject = (collection: string, project: string, modifier: (proj: Project) => void) => (
  modifyCollection(collection, col => {
    let proj = col.projects.find(p => p.name === project);
    if (!proj) {
      proj = { name: project };
      col.projects.push(proj);
    }

    modifier(proj);
  })
);

export const setLastBuildUpdateDate = (collection: string, project: string) => (
  modifyProject(collection, project, proj => { proj.lastBuildUpdateDate = new Date(); })
);

export const getLastBuildUpdateDate = async (collection: string, project: string) => (
  (await getProject(collection, project))?.lastBuildUpdateDate
);

export const getWorkItemUpdateDate = async (collection: string) => (
  (await getCollection(collection))?.workItemUpdateDate
);

export const setWorkItemUpdateDate = async (collection: string) => (
  modifyCollection(collection, col => { col.workItemUpdateDate = new Date(); })
);
