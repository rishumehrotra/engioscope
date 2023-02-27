import buildCron from './builds.js';
import workItemsCron from './workitems.js';
import workItemTypesCron from './work-item-types.js';
import reposCron from './repos.js';
import releaseDefinitionsCron from './release-definitions.js';
import policyConfigurationCron from './policy-configuration.js';
import branchesCron from './branches.js';
import commitsCron from './commits.js';
import testRunsCron from './test-runs.js';

export default () =>
  [
    buildCron,
    workItemsCron,
    workItemTypesCron,
    reposCron,
    releaseDefinitionsCron,
    policyConfigurationCron,
    branchesCron,
    commitsCron,
    testRunsCron,
  ].forEach(fn => fn());
