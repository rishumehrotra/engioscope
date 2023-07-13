import { oneYearInMs } from '../../shared/utils.js';
import { collectionsAndProjects, getConfig } from '../config.js';
import { getLastTestRunDate, setLastTestRunDate } from '../models/cron-update-dates.js';
import { TestRunModel } from '../models/mongoose-models/TestRunModel.js';
import azure from '../scraper/network/azure.js';
import type { TestRun2 } from '../scraper/types-azure.js';

export const bulkSaveTestRuns = (collectionName: string) => (testRuns: TestRun2[]) => {
  return TestRunModel.bulkWrite(
    testRuns.map(testRun => {
      const { release, ...rest } = testRun;

      return {
        updateOne: {
          filter: {
            collectionName,
            'project.name': testRun.project.name,
            'id': testRun.id,
          },
          update: {
            $set: {
              ...rest,
              release: release?.id === 0 ? undefined : release,
            },
          },
          upsert: true,
        },
      };
    })
  );
};

export const getTestRuns = () => {
  const { getTestRunsAsChunksSince } = azure(getConfig());
  const queryStart = new Date(Date.now() - oneYearInMs);

  return Promise.all(
    collectionsAndProjects().map(async ([collection, project]) => {
      await getTestRunsAsChunksSince(
        collection.name,
        project.name,
        (await getLastTestRunDate(collection.name, project.name)) || queryStart,
        bulkSaveTestRuns(collection.name)
      );
      await setLastTestRunDate(collection.name, project.name);
    })
  );
};
