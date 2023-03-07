import { getBuildsAndTimelines } from './builds.js';
import { getWorkItems } from './workitems.js';
import { getWorkItemTypes } from './work-item-types.js';
import { getRepositories } from './repos.js';
import { getReleaseDefinitions } from './release-definitions.js';
import { getPolicyConfigurations } from './policy-configuration.js';
import { getBranchesStats } from './branches.js';
import { getCommits } from './commits.js';
import { getTestRuns } from './test-runs.js';
import { runJob } from './utils.js';
import { getReleases, getReleaseUpdates } from './releases.js';
import { getBuildDefinitions } from './build-definitions.js';

export default () => {
  runJob('fetching builds', t => t.everyHourAt(45), getBuildsAndTimelines);
  runJob('fetching build definitions', t => t.everySunday(), getBuildDefinitions);
  runJob('fetching workitems', t => t.everyHourAt(55), getWorkItems);
  runJob('fetching workitem types', t => t.everyWeekAt('Sun', 8, 30), getWorkItemTypes);
  runJob('fetching repos', t => t.everyDayAt(22, 45), getRepositories);
  runJob(
    'fetching release definitions',
    t => t.everySundayAt(5, 30),
    getReleaseDefinitions
  );
  runJob('fetching repo policies', t => t.every(3).days(), getPolicyConfigurations);
  runJob('fetching branch stats', t => t.everyHourAt(15), getBranchesStats);
  runJob('fetching commits', t => t.every(3).hours(), getCommits);
  runJob('fetching repos', t => t.everyHourAt(35), getTestRuns);
  runJob('fetching releases', t => t.everyHourAt(20), getReleases);
  runJob('fetching release updates', t => t.everyHourAt(35), getReleaseUpdates);
};
