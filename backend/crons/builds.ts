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
import { CodeCoverageModel } from '../models/mongoose-models/CodeCoverage.js';
import { TestRunModel } from '../models/mongoose-models/TestRunModel.js';

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

const syncTestCoverageForBuildIds = (
  collection: string,
  project: string,
  buildIds: number[]
) => {
  const { getTestCoverage } = azure(getConfig());

  return Promise.all(
    chunkArray(buildIds, 20).map(async buildIds => {
      const coverages = await Promise.all(
        buildIds.map(getTestCoverage(collection, project))
      );

      await CodeCoverageModel.bulkWrite(
        coverages
          .filter(c => c.coverageData?.length)
          .map(coverage => {
            return {
              updateOne: {
                filter: {
                  'collectionName': collection,
                  'project': project,
                  'build.id': Number(coverage.build.id),
                },
                update: {
                  $set: {
                    ...coverage,
                    build: { ...coverage.build, id: Number(coverage.build.id) },
                  },
                },
                upsert: true,
              },
            };
          })
      );
    })
  );
};

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

async function getBuildTimelines(
  collection: string,
  project: string,
  builds: AzureBuild[]
) {
  const { getBuildTimeline } = azure(getConfig());

  const missingBuildIds = await missingTimelines(
    collection,
    project,
    builds.map(b => b.id)
  );

  await chunkArray(missingBuildIds, 20).reduce(async (acc, chunk) => {
    await acc;
    await syncBuildTimelines(chunk, getBuildTimeline, collection, project, builds);
  }, Promise.resolve());
}

const saveBuilds = (collectionName: string, project: string) => {
  return async (builds: AzureBuild[]) => {
    await bulkSaveBuilds(collectionName)(builds);
    await setLastBuildUpdateDate(collectionName, project);

    await Promise.all([
      getBuildTimelines(collectionName, project, builds),
      syncTestCoverageForBuildIds(
        collectionName,
        project,
        builds.map(b => b.id)
      ),
    ]);
  };
};

export const deleteBuilds = (collectionName: string, project: string) => {
  return async (builds: AzureBuild[]) => {
    const buildIds = builds.map(b => b.id);

    return Promise.all([
      BuildModel.deleteMany({
        collectionName,
        project,
        id: { $in: buildIds },
      }),
      BuildTimelineModel.deleteMany({
        collectionName,
        project,
        buildId: { $in: buildIds },
      }),
      TestRunModel.deleteMany({
        collectionName,
        project,
        'buildConfiguration.id': { $in: buildIds },
        'release': { $exists: false },
      }),
      CodeCoverageModel.deleteMany({
        collectionName,
        project,
        'build.id': { $in: buildIds },
      }),
    ]);
  };
};

export const syncBuildsAndTimelines = () => {
  const { getBuildsAsChunksSince } = azure(getConfig());
  const queryStart = new Date(Date.now() - oneYearInMs);

  return collectionsAndProjects().reduce<Promise<void>>(
    async (acc, [{ name: collectionName }, { name: project }]) => {
      await acc;

      await getBuildsAsChunksSince(
        collectionName,
        project,
        (await getLastBuildUpdateDate(collectionName, project)) || queryStart,
        builds => {
          const buildsToSave = builds.filter(b => !b.deleted);
          const buildsToDelete = builds.filter(b => b.deleted);

          return Promise.all([
            deleteBuilds(collectionName, project)(buildsToDelete),
            saveBuilds(collectionName, project)(buildsToSave),
          ]);
        }
      );
    },
    Promise.resolve()
  );
};
