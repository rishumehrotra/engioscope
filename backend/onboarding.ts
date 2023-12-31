import mongoose from 'mongoose';
import { setConfig } from './config.js';
import type { ParsedConfig } from './scraper/parse-config.js';
import { getWorkItems } from './crons/workitems.js';
import { getWorkItemTypes } from './crons/work-item-types.js';
import { syncBuildsAndTimelines } from './crons/builds.js';
import { getRepositories } from './crons/repos.js';
import { getReleaseDefinitions } from './crons/release-definitions.js';
import { getReleases } from './crons/releases.js';
import { getPolicyConfigurations } from './crons/policy-configuration.js';
import { getBuildDefinitions } from './crons/build-definitions.js';
import { getBranchesStats } from './crons/branches.js';
import { getCommits } from './crons/commits.js';
import { getTestRuns } from './crons/test-runs.js';
import {
  getMissingSonarMeasures,
  onboardQuailtyGateHistory,
  refreshSonarProjects,
  updateRepoToSonarMapping,
} from './crons/sonar.js';
import { updatePullRequests } from './crons/pull-requests.js';

export default async (config: ParsedConfig) => {
  // TODO: This belongs at a higher layer, maybe
  setConfig(config);

  // Disabling floating promise since mongoose takes care of this internally
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  mongoose.connect(config.mongoUrl);

  await getWorkItems();
  await getWorkItemTypes();
  await syncBuildsAndTimelines();
  await getRepositories();
  await getReleaseDefinitions();
  await getReleases();
  await getPolicyConfigurations();
  await getBuildDefinitions();
  await getBranchesStats();
  await getCommits();
  await getTestRuns();
  await refreshSonarProjects();
  await getMissingSonarMeasures();
  await onboardQuailtyGateHistory();
  await updatePullRequests();
  await updateRepoToSonarMapping();

  // eslint-disable-next-line no-console
  console.log('Done.');
};
