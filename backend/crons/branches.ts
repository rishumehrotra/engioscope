import { oneDayInMs, oneHourInMs } from '../../shared/utils.js';
import { getConfig } from '../config.js';
import { BranchModel } from '../models/mongoose-models/BranchModel.js';
import { RepositoryModel } from '../models/mongoose-models/RepositoryModel.js';
import azure from '../scraper/network/azure.js';
import { is400, is404 } from '../scraper/network/http-error.js';
import type { GitBranchStats } from '../scraper/types-azure.js';
import { createSchedule } from './utils.js';

const shouldUpdate = createSchedule({
  frequency: oneHourInMs,
  schedule: s => [
    s`For the first ${oneDayInMs}, check every ${oneHourInMs}.`,
    s`Then till ${3 * oneDayInMs}, check every ${3 * oneHourInMs}.`,
    s`Then till ${6 * oneDayInMs}, check every ${12 * oneHourInMs}.`,
    s`Then till ${18 * oneDayInMs}, check every ${oneDayInMs}.`,
  ],
});

const saveRepoBranch = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  branches: GitBranchStats[]
) => {
  await BranchModel.deleteMany({
    collectionName,
    project,
    repositoryId,
  });

  return BranchModel.insertMany(
    branches.map(branch => ({
      collectionName,
      project,
      repositoryId,
      ...branch,
      date: branch.commit.committer.date,
    }))
  );
};

const branchUpdateDate = async (
  collectionName: string,
  project: string,
  repositoryId: string
) => {
  const result = await BranchModel.find(
    { collectionName, project, repositoryId },
    { date: 1 }
  )
    .sort({ date: -1 })
    .limit(1)
    .lean();

  return result[0]?.date as Date | undefined;
};

type Repo = {
  collectionName: string;
  project: string;
  id: string;
};

const saveFromAPI = async (repo: Repo) => {
  const { getBranchesStats } = azure(getConfig());

  try {
    const branchStats = await getBranchesStats(
      repo.collectionName,
      repo.project
    )(repo.id);

    await saveRepoBranch(repo.collectionName, repo.project, repo.id, branchStats);
  } catch (error) {
    if (is404(error)) return; // Repo probably doesn't exist anymore.
    if (is400(error)) return; // Happens when a repo doesn't have any branches.
    throw error;
  }
};

export const getBranchesStats = async () => {
  const repos = RepositoryModel.find<Repo>(
    { size: { $ne: 0 } },
    { collectionName: 1, project: '$project.name', id: 1 }
  ).lean();

  const counters = {
    requested: 0,
    skipped: 0,
  };

  // eslint-disable-next-line no-restricted-syntax
  for await (const repo of repos) {
    const updateDate = await branchUpdateDate(repo.collectionName, repo.project, repo.id);
    if (!updateDate || shouldUpdate(updateDate)) {
      counters.requested += 1;
      await saveFromAPI(repo);
    } else {
      counters.skipped += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log('Branch stats cron done.', counters);
};
