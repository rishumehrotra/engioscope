import { passInputTo, t } from './trpc.js';
import {
  branchPoliciesInputParser,
  getBranchPolicies,
} from '../../models/policy-configuration.js';

import { getSummary, getSummaryInputParser } from '../../models/repo-listing.js';

export default t.router({
  getBranchPolicies: t.procedure
    .input(branchPoliciesInputParser)
    .query(passInputTo(getBranchPolicies)),

  getSummaries: t.procedure.input(getSummaryInputParser).query(passInputTo(getSummary)),
});
