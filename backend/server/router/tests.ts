import { passInputTo, t } from './trpc.js';
import {
  getTestRunsAndCoverageForRepo,
  testRunsForRepositoryInputParser,
} from '../../models/testruns.js';

export default t.router({
  getTestRunsAndCoverageForRepo: t.procedure
    .input(testRunsForRepositoryInputParser)
    .query(passInputTo(getTestRunsAndCoverageForRepo)),
});
