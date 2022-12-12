import { collectionsAndProjects, getConfig } from '../config.js';
import { bulkSaveReleaseDefinitions } from '../models/release-definitions.js';
import azure from '../scraper/network/azure.js';
import { runJob } from './utils.js';

export const getReleaseDefinitions = async () => {
  const { getReleaseDefinitions } = azure(getConfig());

  await Promise.all(
    collectionsAndProjects()
      .map(([collection, project]) => (
        getReleaseDefinitions(collection.name, project.name)
          .then(bulkSaveReleaseDefinitions(collection.name, project.name))
      ))
  );
};

export default () => (
  runJob('fetching repos', t => t.everyDayAt(22, 0), getReleaseDefinitions)
);
