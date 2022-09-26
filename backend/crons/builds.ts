import { collectionsAndProjects, getConfig } from '../config.js';
import { getLastBuildUpdateDate, setLastBuildUpdateDate } from '../meta-data.js';
import { missingTimelines, saveBuildTimeline } from '../models/build-timeline.js';
import { saveBuild } from '../models/builds.js';
import azure from '../scraper/network/azure.js';
import type { ParsedCollection } from '../scraper/parse-config.js';
import type { Build, Timeline } from '../scraper/types-azure.js';
import { runJob } from './utils.js';

const putBuildInDb = (collection: ParsedCollection, build: Build) => {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    definition, project: discarded, repository, ...rest
  } = build;

  return saveBuild(collection.name)(build);
};

const putBuildTimelineInDb = (
  collection: string,
  project: string,
  buildId: number
) => async (buildTimeline: Timeline | null) => (
  buildTimeline
    ? saveBuildTimeline(collection, project)(buildId, buildTimeline)
    : null
);

export const getBuildsAndTimelines = async () => {
  const { getBuildsSince, getBuildTimeline } = azure(getConfig());

  await Promise.all(
    collectionsAndProjects().map(async ([collection, project]) => {
      const lastBuildUpdateDate = (
        await getLastBuildUpdateDate(collection.name, project.name)
        || getConfig().azure.queryFrom
      );

      console.log('Fetching builds', {
        collection: collection.name,
        project: project.name,
        lastBuildUpdateDate
      });

      const builds = await getBuildsSince(collection.name, project.name)(lastBuildUpdateDate);
      await setLastBuildUpdateDate(collection.name, project.name);

      await Promise.all([
        ...builds.map(build => putBuildInDb(collection, build)),
        missingTimelines(collection.name, project.name)(builds.map(b => b.id))
          .then(buildIds => Promise.all(
            buildIds.map(async buildId => (
              getBuildTimeline(collection.name, project.name)(buildId)
                .then(putBuildTimelineInDb(collection.name, project.name, buildId))
            ))
          ))
      ]);
    })
  );
};

export default () => (
  runJob('fetching builds', t => t.everyHourAt(45), getBuildsAndTimelines)
);
