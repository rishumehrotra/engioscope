import { passInputTo, t } from './trpc.js';
import {
  getReposListingForTestsDrawer,
  getTestRunsAndCoverageForRepo,
  testRunsForRepositoryInputParser,
} from '../../models/testruns.js';
import { filteredReposInputParser } from '../../models/active-repos.js';

export default t.router({
  getTestRunsAndCoverageForRepo: t.procedure
    .input(testRunsForRepositoryInputParser)
    .query(passInputTo(getTestRunsAndCoverageForRepo)),

  getReposListingForTestsDrawer: t.procedure
    .input(filteredReposInputParser)
    .query(passInputTo(getReposListingForTestsDrawer)),
});
