import { collectionsAndProjects, getConfig } from '../config.js';
import { bulkUpsertWorkItemTypes } from '../models/work-item-types.js';
import azure from '../scraper/network/azure.js';
import { runJob } from './utils.js';

export const getWorkItemTypes = () => {
  const { getWorkItemTypes } = azure(getConfig());

  return (
    Promise.all(collectionsAndProjects().map(([collection, project]) => (
      getWorkItemTypes(collection.name, project.name)
        .then(bulkUpsertWorkItemTypes(collection.name, project.name))
    )))
  );
};

export default () => runJob('fetching workitem types', t => t.everyWeekAt('Sun', 8, 30), getWorkItemTypes);
