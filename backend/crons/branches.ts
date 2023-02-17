import { getConfig } from '../config.js';
import { BranchModel } from '../models/mongoose-models/BranchModel.js';
import { RepositoryModel } from '../models/mongoose-models/RepositoryModel.js';
import azure from '../scraper/network/azure.js';
import type { GitBranchStats } from '../scraper/types-azure.js';
import { runJob, shouldUpdate } from './utils.js';

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
    if (!(error instanceof Error)) throw error;
    if (!error.message.startsWith('HTTP error')) throw error;
    if (!error.message.includes('400')) throw error;
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
  console.log('Repo cron done.', counters);
};

export default () =>
  runJob('fetching branch stats', t => t.everyHourAt(15), getBranchesStats);
