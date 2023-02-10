import { passInputTo, t } from './trpc.js';
import {
  getHealthyBranchesList,
  getAbandonedBranchesList,
  getDeleteCandidateBranchesList,
  getUnhealthyBranchesList,
  getRepoTotalBranches,
  BranchesListInputParser,
  RepoTotalBranchesInputParser,
} from '../../models/branches.js';

export default t.router({
  getHealthyBranchesList: t.procedure
    .input(BranchesListInputParser)
    .query(passInputTo(getHealthyBranchesList)),

  getDeleteCandidateBranchesList: t.procedure
    .input(BranchesListInputParser)
    .query(passInputTo(getDeleteCandidateBranchesList)),

  getUnhealthyBranchesList: t.procedure
    .input(BranchesListInputParser)
    .query(passInputTo(getUnhealthyBranchesList)),

  getAbandonedBranchesList: t.procedure
    .input(BranchesListInputParser)
    .query(passInputTo(getAbandonedBranchesList)),

  getRepoTotalBranches: t.procedure
    .input(RepoTotalBranchesInputParser)
    .query(passInputTo(getRepoTotalBranches)),
});
