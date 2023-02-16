import { collectionsAndProjects, getConfig } from '../config.js';
import { bulkSaveCommits, getLatestCommitIdAndDate } from '../models/commits.js';
import { RepositoryModel } from '../models/repos.js';
import azure from '../scraper/network/azure.js';
import { runJob, shouldUpdate } from './utils.js';

export const getCommits = async () => {
  const { getCommitsSince } = azure(getConfig());

  const counts = {
    hit: 0,
    skipped: 0,
  };

  await collectionsAndProjects().reduce<Promise<unknown>>(
    async (acc, [collection, project]) => {
      await acc;

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
          await getCommitsSince(
            collection.name,
            project.name,
            repo.id,
            commitIdAndDate?.commitId
          ).then(bulkSaveCommits(collection.name, project.name, repo.id));
        } else {
          counts.skipped += 1;
        }
      }
    },
    Promise.resolve()
  );

  // eslint-disable-next-line no-console
  console.log(`Done commits cron. Hit: ${counts.hit}, skipped: ${counts.skipped}`);
};

export default () => runJob('fetching commits', t => t.everyHourAt(45), getCommits);
