import { passInputTo, t } from './trpc.js';
import {
  branchPoliciesInputParser,
  getBranchPolicies,
} from '../../models/policy-configuration.js';

import {
  getSummary,
  getSummaryInputParser,
  getNonYamlPipelines,
  NonYamlPipelinesParser,
  getTestsCoverageSummaries,
} from '../../models/repo-listing.js';

export default t.router({
  getBranchPolicies: t.procedure
    .input(branchPoliciesInputParser)
    .query(passInputTo(getBranchPolicies)),

  getSummaries: t.procedure.input(getSummaryInputParser).query(passInputTo(getSummary)),

  getNonYamlPipelines: t.procedure
    .input(NonYamlPipelinesParser)
    .query(passInputTo(getNonYamlPipelines)),

  getTestsCoverageSummaries: t.procedure
    .input(getSummaryInputParser)
    .query(passInputTo(getTestsCoverageSummaries)),
});
