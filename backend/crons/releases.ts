import { collectionsAndProjects, getConfig } from '../config.js';
import {
  getLastReleaseFetchDate,
  setLastReleaseFetchDate,
} from '../models/cron-update-dates.js';
import { bulkSaveReleases, getReleaseUpdateDates } from '../models/releases.js';
import azure from '../scraper/network/azure.js';
import { runJob, shouldUpdate } from './utils.js';

const defaultQueryStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 395);
  return d;
};

export const getReleases = async () => {
  const { getReleasesAsChunks } = azure(getConfig());

  await Promise.all(
    collectionsAndProjects().map(async ([collection, project]) => {
      await getReleasesAsChunks(
        collection.name,
        project.name,
        (await getLastReleaseFetchDate(collection.name, project.name)) ||
          defaultQueryStart(),
        bulkSaveReleases(collection.name)
      );
      await setLastReleaseFetchDate(collection.name, project.name);
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

      await getReleasesForReleaseIdsAsChunks(
        collection.name,
        project.name,
        releasesToFetch,
        bulkSaveReleases(collection.name)
      );
    })
  );
};

runJob('fetching releases', t => t.everyHourAt(20), getReleases);
runJob('fetching release updates', t => t.everyHourAt(35), getReleaseUpdates);
