import { collectionsAndProjects, getConfig } from '../config.js';
import { ReleaseDefinitionModel } from '../models/release-definitions.js';
import azure from '../scraper/network/azure.js';
import type { ReleaseDefinition as AzureReleaseDefinition } from '../scraper/types-azure.js';

export const bulkSaveReleaseDefinitions =
  (collectionName: string, project: string) =>
  (releaseDefinitions: AzureReleaseDefinition[]) =>
    ReleaseDefinitionModel.bulkWrite(
      releaseDefinitions.map(r => {
        const { createdBy, modifiedBy, ...rest } = r;

        return {
          updateOne: {
            filter: {
              collectionName,
              project,
              id: r.id,
            },
            update: {
              $set: {
                createdById: createdBy.id,
                modifiedById: modifiedBy.id,
                ...rest,
              },
            },
            upsert: true,
          },
        };
      })
    );

export const getReleaseDefinitions = async () => {
  const { getReleaseDefinitionsAsChunks, getReleaseDefinition } = azure(getConfig());

  await Promise.all(
    collectionsAndProjects().map(([collection, project]) =>
      getReleaseDefinitionsAsChunks(collection.name, project.name, async defns => {
        // eslint-disable-next-line no-restricted-syntax
        for await (const d of defns) {
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
