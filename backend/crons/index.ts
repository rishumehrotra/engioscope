import buildCron from './builds.js';
import workItemsCron from './workitems.js';
import workItemTypesCron from './work-item-types.js';

export default () => [
  buildCron,
  workItemsCron,
  workItemTypesCron
].forEach(fn => fn());
