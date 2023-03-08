import { collections, collectionsAndProjects, getConfig } from '../config.js';
import {
  getLastReleaseFetchDate,
  setLastReleaseFetchDate,
} from '../models/cron-update-dates.js';
import type {
  Artifact,
  ReleaseEnvironment,
} from '../models/mongoose-models/ReleaseEnvironment.js';
import { ReleaseModel } from '../models/mongoose-models/ReleaseEnvironment.js';
import { getReleaseUpdateDates } from '../models/releases.js';
import azure from '../scraper/network/azure.js';
import { is404 } from '../scraper/network/http-error.js';
import type {
  Release as AzureRelease,
  ReleaseEnvironment as AzureReleaseEnvironment,
  Artifact as AzureArtifact,
} from '../scraper/types-azure.js';
import { shouldUpdate } from './utils.js';

const defaultQueryStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 395);
  return d;
};

const environmentFromAPI = (environment: AzureReleaseEnvironment): ReleaseEnvironment => {
  const { deploySteps, ...rest } = environment;
  return {
    ...rest,
    deploySteps: deploySteps.map(d => {
      const { requestedBy, requestedFor, lastModifiedBy, ...rest } = d;
      return {
        ...rest,
        requestedById: requestedBy.id,
        requestedForId: requestedFor.id,
        lastModifiedById: lastModifiedBy.id,
      };
    }),
  };
};

const artifactFromAPI = (artifact: AzureArtifact): Artifact => ({
  sourceId: artifact.sourceId,
  type: artifact.type,
  alias: artifact.alias,
  isPrimary: artifact.isPrimary,
  definition: {
    isTriggeringArtifact: artifact.definitionReference.IsTriggeringArtifact
      ? artifact.definitionReference.IsTriggeringArtifact.id === 'True'
      : undefined,
    buildPipelineUrl:
      artifact.definitionReference.artifactSourceDefinitionUrl?.id || undefined,
    buildUri: artifact.definitionReference.buildUri?.id || undefined,
    buildDefinitionId: artifact.definitionReference.definition?.id
      ? Number.isNaN(Number(artifact.definitionReference.definition.id))
        ? undefined
        : Number(artifact.definitionReference.definition.id)
      : undefined,
    branch: artifact.definitionReference.branch?.id || undefined,
    pullRequestId: artifact.definitionReference.pullRequestId?.id || undefined,
    pullRequestSourceBranch:
      artifact.definitionReference.pullRequestSourceBranch?.id || undefined,
    pullRequestSourceBranchCommitId:
      artifact.definitionReference.pullRequestSourceBranchCommitId?.id || undefined,
    pullRequestMergeCommitId:
      artifact.definitionReference.pullRequestMergeCommitId?.id || undefined,
    pullRequestTargetBranch:
      artifact.definitionReference.pullRequestTargetBranch?.id || undefined,
    requestedForId: artifact.definitionReference.requestedForId?.id || undefined,
    repositoryId: artifact.definitionReference.repository?.id || undefined,
    repositoryName: artifact.definitionReference.repository?.name || undefined,
    connectionName: artifact.definitionReference.connection?.name || undefined,
    connectionId: artifact.definitionReference.connection?.id || undefined,
  },
});

export const bulkSaveReleases = (collectionName: string) => (releases: AzureRelease[]) =>
  ReleaseModel.bulkWrite(
    releases.map(release => {
      const { projectReference, environments, artifacts, releaseDefinition, ...rest } =
        release;

      return {
        updateOne: {
          filter: {
            collectionName,
            id: release.id,
            project: projectReference.name,
          },
          update: {
            $set: {
              ...rest,
              releaseDefinitionId: releaseDefinition.id,
              releaseDefinitionName: releaseDefinition.name,
              releaseDefinitionUrl: releaseDefinition.url,
              project: projectReference.name,
              environments: environments.map(environmentFromAPI),
              artifacts: artifacts.map(artifactFromAPI),
            },
          },
          upsert: true,
        },
      };
    })
  );

export const getReleases = async () => {
  const { getReleasesAsChunks } = azure(getConfig());

  await Promise.all(
    collections().map(({ name: collectionName, projects }) => {
      return projects.reduce(async (acc, { name: project }) => {
        await acc;

        await getReleasesAsChunks(
          collectionName,
          project,
          (await getLastReleaseFetchDate(collectionName, project)) || defaultQueryStart(),
          bulkSaveReleases(collectionName)
        );
        await setLastReleaseFetchDate(collectionName, project);
      }, Promise.resolve());
    })
  );
};

export const getReleaseUpdates = async () => {
  const { getReleasesForReleaseIdsAsChunks } = azure(getConfig());

  await Promise.all(
    collectionsAndProjects().map(async ([collection, project]) => {
      const releaseUpdateDates = await getReleaseUpdateDates(
        collection.name,
        project.name
      );
      const releasesToFetch = releaseUpdateDates
        .filter(x => shouldUpdate(x.date))
        .map(x => x.id);

      const recurse = async (rids: number[]): Promise<unknown> => {
        try {
          await getReleasesForReleaseIdsAsChunks(
            collection.name,
            project.name,
            rids,
            bulkSaveReleases(collection.name)
          );
        } catch (error) {
          if (!is404(error)) throw error;

          // This is a 404, which means one of the releases was deleted.
          // Start a recursive binary search to find and delete the offending
          // release, while saving the rest.

          if (rids.length === 1) {
            // Search complete. This release ID doesn't exist. Delete it.
            return ReleaseModel.deleteOne({
              collectionName: collection.name,
              project,
              id: rids[0],
            });
          }

          if (rids.length === 0) {
            // lolwut?
            return;
          }

          // Split releaseIds list in two, recurse
          const parts = [rids.slice(0, rids.length / 2), rids.slice(rids.length / 2)];
          return Promise.all(parts.map(recurse));
        }
      };

      return recurse(releasesToFetch);
    })
  );
};
