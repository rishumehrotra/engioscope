import { passInputTo, t } from './trpc.js';
import {
  branchPoliciesInputParser,
  getBranchPolicies,
} from '../../models/policy-configuration.js';

export default t.router({
  getBranchPolicies: t.procedure
    .input(branchPoliciesInputParser)
    .query(passInputTo(getBranchPolicies)),
});
