import { collectionsAndProjects, getConfig } from '../config.js';
import { bulkSavePolicies } from '../models/policy-configuration.js';
import azure from '../scraper/network/azure.js';
import { runJob } from './utils.js';

export const getPolicyConfigurations = () => {
  const { getPolicyConfigurations } = azure(getConfig());

  return collectionsAndProjects().reduce<Promise<void>>(
    async (acc, [collection, project]) => {
      await acc;
      await getPolicyConfigurations(collection.name, project.name).then(
        bulkSavePolicies(collection.name, project.name)
      );
    },
    Promise.resolve()
  );
};

export default () =>
  runJob('fetching repo policies', t => t.every(3).days(), getPolicyConfigurations);
