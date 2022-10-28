import { oneDayInMs } from '../shared/utils.js';
import type { ParsedConfig } from './scraper/parse-config.js';

let conf: ParsedConfig;

export const setConfig = (config: ParsedConfig) => { conf = config; };

export const getConfig = () => conf;
export const configForCollection = (collection: string) => (
  conf.azure.collections.find(c => c.name === collection)
);

export const configForProject = (collection: string, project: string) => (
  configForCollection(collection)?.projects.find(p => p.name === project)
);

export const collections = () => getConfig().azure.collections;

export const collectionsAndProjects = () => (
  getConfig().azure.collections.flatMap(collection => (
    collection.projects.map(project => (
      [collection, project] as const
    ))
  ))
);

export const queryPeriodDays = () => (
  (Date.now() - getConfig().azure.queryFrom.getTime()) / oneDayInMs
);
