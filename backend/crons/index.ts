import buildCron from './builds.js';

export default () => [
  buildCron
].forEach(fn => fn());
