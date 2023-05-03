import {
  PullRequestsSummaryForRepoInputParser,
  getPullRequestsSummaryForRepo,
} from '../../models/pull-requests.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  getPullRequestsSummaryForRepo: t.procedure
    .input(PullRequestsSummaryForRepoInputParser)
    .query(passInputTo(getPullRequestsSummaryForRepo)),
});
