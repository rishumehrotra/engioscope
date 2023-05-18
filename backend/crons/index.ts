import { syncBuildsAndTimelines } from './builds.js';
import { getWorkItems, removeDeletedWorkItems } from './workitems.js';
import { getWorkItemTypes } from './work-item-types.js';
import { getRepositories } from './repos.js';
import { getReleaseDefinitions } from './release-definitions.js';
import { getPolicyConfigurations } from './policy-configuration.js';
import { getBranchesStats } from './branches.js';
import { getCommits } from './commits.js';
import { getTestRuns } from './test-runs.js';
import { setupJob } from './utils.js';
import { getReleases, getReleaseUpdates } from './releases.js';
import { getBuildDefinitions } from './build-definitions.js';
import { refreshSonarProjects, updateRepoToSonarMapping } from './sonar.js';
import { insertSummarySnapshot } from './summary.js';
import { updatePullRequests } from './pull-requests.js';

export default () => {
  setupJob('builds', t => t.everyHourAt(45), syncBuildsAndTimelines);
  setupJob('build definitions', t => t.everySunday(), getBuildDefinitions);
  setupJob('workitems', t => t.everyHourAt(55), getWorkItems);
  setupJob('workitem types', t => t.everyWeekAt('Sun', 8, 30), getWorkItemTypes);
  setupJob('workitem cleanup', t => t.everyDayAt(1), removeDeletedWorkItems);
  setupJob('repos', t => t.everyDayAt(22, 45), getRepositories);
  setupJob('release definitions', t => t.everySundayAt(5, 30), getReleaseDefinitions);
  setupJob('repo policies', t => t.every(3).days(), getPolicyConfigurations);
  setupJob('branch stats', t => t.everyHourAt(15), getBranchesStats);
  setupJob('commits', t => t.every(3).hours(), getCommits);
  // Test runs should be called pretty much imimediately after getting builds
  // Otherwise, test and coverage data looks to be out of sync
  setupJob('test-runs', t => t.everyHourAt(48), getTestRuns);
  setupJob('releases', t => t.everyHourAt(20), getReleases);
  setupJob('release updates', t => t.everyHourAt(35), getReleaseUpdates);
  setupJob('sonar projects', t => t.everyDay(), refreshSonarProjects);
  setupJob('repos to sonar mapping', t => t.everyHourAt(52), updateRepoToSonarMapping);
  setupJob(
    'prepare-summary-snapshot',
    t => t.everyDayAt(4),
    () => insertSummarySnapshot('90 days')
  );
  setupJob('pull-requests', t => t.everyDayAt(3), updatePullRequests);
};
