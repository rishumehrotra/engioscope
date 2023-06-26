import { oneDayInMs, oneHourInMs } from '../../shared/utils.js';
import { collectionsAndProjects, getConfig } from '../config.js';
import { bulkSaveCommits, getLatestCommitIdAndDate } from '../models/commits.js';
import { RepositoryModel } from '../models/mongoose-models/RepositoryModel.js';
import azure from '../scraper/network/azure.js';
import { createSchedule } from './utils.js';

export const shouldUpdate = createSchedule({
  frequency: 3 * oneHourInMs,
  schedule: s => [
    s`For the first ${oneDayInMs}, check every ${3 * oneHourInMs}.`,
    s`Then till ${3 * oneDayInMs}, check every ${6 * oneHourInMs}.`,
    s`Then till ${6 * oneDayInMs}, check every ${12 * oneHourInMs}.`,
    s`Then till ${12 * oneDayInMs}, check every ${oneDayInMs}.`,
  ],
});

export const getCommits = async () => {
  const { getCommitsAsChunksSince } = azure(getConfig());

  const counts = {
    hit: 0,
    skipped: 0,
  };

  await Promise.all(
    collectionsAndProjects().map(async ([collection, project]) => {
      const repos = RepositoryModel.find({
        'collectionName': collection.name,
        'project.name': project.name,
      });

      // eslint-disable-next-line no-restricted-syntax
      for await (const repo of repos) {
        const commitIdAndDate = await getLatestCommitIdAndDate(
          collection.name,
          project.name,
          repo.id
        );

        if (!commitIdAndDate || shouldUpdate(commitIdAndDate.date)) {
          counts.hit += 1;
          await getCommitsAsChunksSince(
            collection.name,
            project.name,
            repo.id,
            commitIdAndDate?.date,
            bulkSaveCommits(collection.name, project.name, repo.id)
          );
        } else {
          counts.skipped += 1;
        }
      }
    })
  );

  // eslint-disable-next-line no-console
  console.log(`Done commits cron. Hit: ${counts.hit}, skipped: ${counts.skipped}`);
};
