import { collectionsAndProjects, getConfig } from '../config.js';
import { bulkSaveBuildDefinitions } from '../models/build-definitions.js';
import azure from '../scraper/network/azure.js';
import { runJob } from './utils.js';

export const getBuildDefinitions = () => {
  const { getBuildDefinitions } = azure(getConfig());

  return collectionsAndProjects().reduce<Promise<unknown>>(
    async (acc, [collection, project]) => {
      await acc;

      return getBuildDefinitions(collection.name, project.name).then(
        bulkSaveBuildDefinitions(collection.name)
      );
    },
    Promise.resolve()
  );
};

export default () =>
  runJob('fetching build definitions', t => t.everySunday(), getBuildDefinitions);
