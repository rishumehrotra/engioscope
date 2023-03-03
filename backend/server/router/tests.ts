import { passInputTo, t } from './trpc.js';
import {
  getTestRunsForRepository,
  TestRunsForRepositoryInputParser,
} from '../../models/testruns.js';

export default t.router({
  getTestRunsForRepository: t.procedure
    .input(TestRunsForRepositoryInputParser)
    .query(passInputTo(getTestRunsForRepository)),
});
