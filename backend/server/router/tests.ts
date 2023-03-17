import { passInputTo, t } from './trpc.js';
import {
  getTestRunsAndCoverageForRepo,
  TestRunsForRepositoryInputParser,
} from '../../models/testruns.js';

export default t.router({
  getTestRunsAndCoverageForRepo: t.procedure
    .input(TestRunsForRepositoryInputParser)
    .query(passInputTo(getTestRunsAndCoverageForRepo)),
});
