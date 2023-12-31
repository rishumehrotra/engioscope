import { passInputTo, t } from './trpc.js';
import {
  branchPoliciesInputParser,
  getBranchPolicies,
} from '../../models/policy-configuration.js';

import {
  getSummary,
  getNonYamlPipelines,
  repoFiltersAndSorterInputParser,
  getFilteredAndSortedReposWithStats,
  getFilteredReposCount,
  getRepoListingWithPipelineCount,
} from '../../models/repo-listing.js';
import { filteredReposInputParser } from '../../models/active-repos.js';
import { collectionAndProjectInputParser } from '../../models/helpers.js';
import { getRepoIdsAndNames } from '../../models/repos.js';

export default t.router({
  getBranchPolicies: t.procedure
    .input(branchPoliciesInputParser)
    .query(passInputTo(getBranchPolicies)),

  getSummaries: t.procedure
    .input(filteredReposInputParser)
    .query(passInputTo(getSummary)),

  getNonYamlPipelines: t.procedure
    .input(filteredReposInputParser)
    .query(passInputTo(getNonYamlPipelines)),

  getFilteredAndSortedReposWithStats: t.procedure
    .input(repoFiltersAndSorterInputParser)
    .query(passInputTo(getFilteredAndSortedReposWithStats)),

  getFilteredReposCount: t.procedure
    .input(filteredReposInputParser)
    .query(passInputTo(getFilteredReposCount)),

  getRepoListingWithPipelineCount: t.procedure
    .input(filteredReposInputParser)
    .query(passInputTo(getRepoListingWithPipelineCount)),

  getRepoIdsAndNames: t.procedure
    .input(collectionAndProjectInputParser)
    .query(passInputTo(getRepoIdsAndNames)),
});
