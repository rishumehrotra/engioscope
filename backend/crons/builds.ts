import { oneYearInMs } from '../../shared/utils.js';
import { collectionsAndProjects, getConfig } from '../config.js';
import { BuildTimelineModel } from '../models/mongoose-models/BuildTimelineModel.js';
import {
  getLastBuildUpdateDate,
  setLastBuildUpdateDate,
} from '../models/cron-update-dates.js';
import { BuildModel } from '../models/mongoose-models/BuildModel.js';
import azure from '../scraper/network/azure.js';
import type { Build as AzureBuild, Timeline } from '../scraper/types-azure.js';
import { chunkArray } from '../utils.js';

const missingTimelines = async (
  collectionName: string,
  project: string,
  buildIds: number[]
) => {
  const existingBuildTimelines = await BuildTimelineModel.find(
    { collectionName, project, buildId: { $in: buildIds } },
    { buildId: 1 }
  ).lean();

  const existingBuildIds = new Set(existingBuildTimelines.map(bt => bt.buildId));

  return buildIds.filter(b => !existingBuildIds.has(b));
};

const saveBuildTimeline =
  (collectionName: string, project: string) =>
  async (buildId: number, buildDefinitionId: number, buildTimeline: Timeline | null) =>
    buildTimeline
      ? BuildTimelineModel.updateOne(
          {
            collectionName,
            project,
            buildId,
          },
          { $set: { ...buildTimeline, buildDefinitionId } },
          { upsert: true }
        )
          .lean()
          .then(result => result._id)
      : null;

const putBuildTimelineInDb =
  (collection: string, project: string, buildId: number, buildDefinitionId: number) =>
  async (buildTimeline: Timeline | null) =>
    buildTimeline
      ? saveBuildTimeline(collection, project)(buildId, buildDefinitionId, buildTimeline)
      : null;

const bulkSaveBuilds = (collectionName: string) => (builds: AzureBuild[]) =>
  BuildModel.bulkWrite(
    builds.map(build => {
      const { project, ...rest } = build;

      return {
        updateOne: {
          filter: {
            collectionName,
            'project': project.name,
            'repository.id': build.repository.id,
            'id': build.id,
          },
          update: { $set: rest },
          upsert: true,
        },
      };
    })
  );

const syncBuildTimelines = (
  buildIds: number[],
  getBuildTimeline: (
    collectionName: string,
    projectName: string
  ) => (buildId: number) => Promise<Timeline | null>,
  collectionName: string,
  project: string,
  builds: AzureBuild[]
) => {
  return Promise.all(
    buildIds.map(async buildId =>
      getBuildTimeline(
        collectionName,
        project
      )(buildId).then(
        putBuildTimelineInDb(
          collectionName,
          project,
          buildId,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          builds.find(b => b.id === buildId)!.definition.id
        )
      )
    )
  );
};

export const getBuildsAndTimelines = () => {
  const { getBuildTimeline, getBuildsAsChunksSince } = azure(getConfig());
  const queryStart = new Date(Date.now() - oneYearInMs);

  return collectionsAndProjects().reduce<Promise<void>>(
    async (acc, [collection, project]) => {
      await acc;

      await getBuildsAsChunksSince(
        collection.name,
        project.name,
        (await getLastBuildUpdateDate(collection.name, project.name)) || queryStart,
        async builds => {
          await bulkSaveBuilds(collection.name)(builds);
          await setLastBuildUpdateDate(collection.name, project.name);

          const missingBuildIds = await missingTimelines(
            collection.name,
            project.name,
            builds.map(b => b.id)
          );

          await chunkArray(missingBuildIds, 20).reduce(async (acc, chunk) => {
            await acc;
            await syncBuildTimelines(
              chunk,
              getBuildTimeline,
              collection.name,
              project.name,
              builds
            );
          }, Promise.resolve());
        }
      );
    },
    Promise.resolve()
  );
};
