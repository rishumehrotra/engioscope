import { collectionsAndProjects, getConfig } from '../config.js';
import { bulkSaveRepositories } from '../models/repos.js';
import azure from '../scraper/network/azure.js';
import { runJob } from './utils.js';

export const getRepositories = async () => {
  const { getRepositories } = azure(getConfig());

  await Promise.all(
    collectionsAndProjects()
      .map(([collection, project]) => (
        getRepositories(collection.name, project.name)
          .then(bulkSaveRepositories(collection.name))
      ))
  );
};

export default () => (
  runJob('fetching repos', t => t.everyDayAt(22, 45), getRepositories)
);
