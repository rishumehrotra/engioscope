import { collectionsAndProjects, getConfig } from '../config.js';
import { missingTimelines, saveBuildTimeline } from '../models/build-timeline.js';
import { bulkSaveBuilds } from '../models/builds.js';
import { getLastBuildUpdateDate, setLastBuildUpdateDate } from '../models/cron-update-dates.js';
import azure from '../scraper/network/azure.js';
import type { Timeline } from '../scraper/types-azure.js';
import { chunkArray } from '../utils.js';
import { runJob } from './utils.js';

const putBuildTimelineInDb = (
  collection: string,
  project: string,
  buildId: number,
  buildDefinitionId: number
) => async (buildTimeline: Timeline | null) => (
  buildTimeline
    ? saveBuildTimeline(collection, project)(buildId, buildDefinitionId, buildTimeline)
    : null
);

export const getBuildsAndTimelines = () => {
  const { getBuildsSince, getBuildTimeline } = azure(getConfig());

  return collectionsAndProjects().reduce<Promise<void>>(async (acc, [collection, project]) => {
    await acc;
    const lastBuildUpdateDate = (
      await getLastBuildUpdateDate(collection.name, project.name)
      || getConfig().azure.queryFrom
    );

    const builds = await getBuildsSince(collection.name, project.name)(lastBuildUpdateDate);

    await bulkSaveBuilds(collection.name)(builds);
    await setLastBuildUpdateDate(collection.name, project.name);

    const missingBuildIds = await missingTimelines(collection.name, project.name)(builds.map(b => b.id));

    await chunkArray(missingBuildIds, 20).reduce(async (acc, chunk) => {
      await acc;
      await Promise.all(chunk.map(async buildId => (
        getBuildTimeline(collection.name, project.name)(buildId)
          .then(putBuildTimelineInDb(
            collection.name,
            project.name,
            buildId,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            builds.find(b => b.id === buildId)!.definition.id
          ))
      )));
    }, Promise.resolve());
  }, Promise.resolve());
};

export default () => (
  runJob('fetching builds', t => t.everyHourAt(45), getBuildsAndTimelines)
);
