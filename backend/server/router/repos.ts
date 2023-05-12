import { memoizeForUI, passInputTo, t } from './trpc.js';
import {
  branchPoliciesInputParser,
  getBranchPolicies,
} from '../../models/policy-configuration.js';

import {
  getSummary,
  getSummaryInputParser,
  getNonYamlPipelines,
  NonYamlPipelinesParser,
  RepoOverviewStatsInputParser,
  getRepoOverviewStats,
  repoFiltersAndSorterInputParser,
  getFilteredAndSortedReposWithStats,
  FilteredReposInputParser,
  getFilteredReposCount,
} from '../../models/repo-listing.js';

export default t.router({
  getBranchPolicies: t.procedure
    .input(branchPoliciesInputParser)
    .query(passInputTo(getBranchPolicies)),

  getSummaries: t.procedure.input(getSummaryInputParser).query(passInputTo(getSummary)),

  getNonYamlPipelines: t.procedure
    .input(NonYamlPipelinesParser)
    .query(passInputTo(getNonYamlPipelines)),

  getRepoOverviewStats: t.procedure
    .input(RepoOverviewStatsInputParser)
    .query(passInputTo(getRepoOverviewStats)),

  getFilteredAndSortedReposWithStats: t.procedure
    .input(repoFiltersAndSorterInputParser)
    .query(passInputTo(memoizeForUI(getFilteredAndSortedReposWithStats))),

  getFilteredReposCount: t.procedure
    .input(FilteredReposInputParser)
    .query(passInputTo(getFilteredReposCount)),
});
