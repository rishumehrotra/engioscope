import { passInputTo, t } from './trpc.js';
import {
  getReposListingForTestsDrawer,
  getTestsAndCoverageForRepoIds,
  testRunsForRepositoriesInputParser,
} from '../../models/testruns.js';
import { filteredReposInputParser } from '../../models/active-repos.js';

export default t.router({
  getTestsAndCoverageForRepoIds: t.procedure
    .input(testRunsForRepositoriesInputParser)
    .query(passInputTo(getTestsAndCoverageForRepoIds)),

  getReposListingForTestsDrawer: t.procedure
    .input(filteredReposInputParser)
    .query(passInputTo(getReposListingForTestsDrawer)),
});
