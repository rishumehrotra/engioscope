import { collectionsAndProjects, getConfig } from '../config.js';
import { bulkSaveReleaseDefinitions } from '../models/release-definitions.js';
import azure from '../scraper/network/azure.js';
import { runJob } from './utils.js';

export const getReleaseDefinitions = async () => {
  const { getReleaseDefinitions, getReleaseDefinition } = azure(getConfig());

  await Promise.all(
    collectionsAndProjects().map(([collection, project]) =>
      getReleaseDefinitions(collection.name, project.name).then(async defns => {
        // eslint-disable-next-line no-restricted-syntax
        for (const d of defns) {
          // eslint-disable-next-line no-await-in-loop
          await getReleaseDefinition(collection.name, project.name, d.id)
            .then(d => bulkSaveReleaseDefinitions(collection.name, project.name)([d]))
            .catch(error => {
              if (error.message?.includes('404')) return;
              throw error;
            });
        }
      })
    )
  );
};

export default () =>
  runJob(
    'fetching release definitions',
    t => t.everySundayAt(5, 30),
    getReleaseDefinitions
  );
