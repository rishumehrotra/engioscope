import buildCron from './builds.js';
import workItemsCron from './workitems.js';
import workItemTypesCron from './work-item-types.js';
import reposCron from './repos.js';
import releaseDefinitionsCron from './release-definitions.js';
import policyConfigurationCron from './policy-configuration.js';

export default () =>
  [
    buildCron,
    workItemsCron,
    workItemTypesCron,
    reposCron,
    releaseDefinitionsCron,
    policyConfigurationCron,
  ].forEach(fn => fn());
