import { collectionsAndProjects, getConfig } from '../config.js';
import { getLastBuildUpdateDate, setLastBuildUpdateDate } from '../meta-data.js';
import { missingTimelines, saveBuildTimeline } from '../models/build-timeline.js';
import { bulkSaveBuild } from '../models/builds.js';
import azure from '../scraper/network/azure.js';
import type { Timeline } from '../scraper/types-azure.js';
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

  return Promise.all(
    collectionsAndProjects().map(async ([collection, project]) => {
      const lastBuildUpdateDate = (
        await getLastBuildUpdateDate(collection.name, project.name)
        || getConfig().azure.queryFrom
      );

      const builds = await getBuildsSince(collection.name, project.name)(lastBuildUpdateDate);

      await Promise.all([
        bulkSaveBuild(collection.name)(builds),
        missingTimelines(collection.name, project.name)(builds.map(b => b.id))
          .then(buildIds => Promise.all(
            buildIds.map(async buildId => (
              getBuildTimeline(collection.name, project.name)(buildId)
                .then(putBuildTimelineInDb(
                  collection.name,
                  project.name,
                  buildId,
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  builds.find(b => b.id === buildId)!.definition.id
                ))
            ))
          ))
      ]);

      await setLastBuildUpdateDate(collection.name, project.name);
    })
  );
};

export default () => (
  runJob('fetching builds', t => t.everyHourAt(45), getBuildsAndTimelines)
);
