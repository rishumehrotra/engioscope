import buildCron from './builds.js';
import workItemsCron from './workitems.js';

export default () => [
  buildCron,
  workItemsCron
].forEach(fn => fn());
