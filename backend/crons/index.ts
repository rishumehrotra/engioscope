import buildCron from './builds.js';
import workItemsCron from './workitems.js';
import workItemTypesCron from './work-item-types.js';
import reposCron from './repos.js';

export default () => [
  buildCron,
  workItemsCron,
  workItemTypesCron,
  reposCron
].forEach(fn => fn());
