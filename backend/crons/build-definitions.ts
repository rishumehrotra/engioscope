import { collectionsAndProjects, getConfig } from '../config.js';
import { BuildDefinitionModel } from '../models/mongoose-models/BuildDefinitionModel.js';
import { BuildModel } from '../models/mongoose-models/BuildModel.js';
import { TestRunModel } from '../models/mongoose-models/TestRunModel.js';
import azure from '../scraper/network/azure.js';
import type { BuildDefinitionReference } from '../scraper/types-azure.js';

export const bulkSaveBuildDefinitions =
  (collectionName: string, project: string) =>
  async (buildDefinitions: BuildDefinitionReference[]) => {
    // Delete any pipelines that have been deleted from Azure
    await BuildDefinitionModel.deleteMany({
      collectionName,
      project,
      id: { $nin: buildDefinitions.map(b => b.id) },
    });

    await BuildModel.deleteMany({
      collectionName,
      project,
      'definition.id': { $nin: buildDefinitions.map(b => b.id) },
    });

    await TestRunModel.deleteMany({
      collectionName,
      'project.name': project,
      'buildConfiguration.buildDefinitionId': { $nin: buildDefinitions.map(b => b.id) },
    });

    return BuildDefinitionModel.bulkWrite(
      buildDefinitions.map(buildDefinition => {
        const { project, process, ...rest } = buildDefinition;

        const processForDB =
          process.type === 2
            ? {
                processType: 2 as const,
                yamlFilename: process.yamlFilename,
              }
            : { processType: 1 as const };

        return {
          updateOne: {
            filter: {
              collectionName,
              project: project.name,
              id: buildDefinition.id,
            },
            update: {
              $set: {
                process: processForDB,
                repositoryId: buildDefinition.repository?.id,
                ...rest,
              },
            },
            upsert: true,
          },
        };
      })
    );
  };

export const getBuildDefinitions = () => {
  const { getBuildDefinitions } = azure(getConfig());

  return collectionsAndProjects().reduce<Promise<unknown>>(
    async (acc, [collection, project]) => {
      await acc;

      return getBuildDefinitions(collection.name, project.name).then(
        bulkSaveBuildDefinitions(collection.name, project.name)
      );
    },
    Promise.resolve()
  );
};
