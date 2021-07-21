import { lens } from '@rakeshpai/lens.ts';
import { applySpec, pipe } from 'rambda';

export type OTWBranches = [
  total: number,
  active: number,
  abandoned: number,
  possiblyConflicting: number,
  deleteCandidates: number
];

export type UIBranches = {
  total: number;
  active: number;
  abandoned: number;
  possiblyConflicting: number;
  deleteCandidates: number;
};

const branchLens = lens<OTWBranches>();

const totalBranchesLens = branchLens[0];
const activeBranchesLens = branchLens[1];
const abandonedBranchesLens = branchLens[2];
const possiblyConflictingLens = branchLens[3];
const deleteCandidateBranchesLens = branchLens[4];

export const viewBranches = (branches: OTWBranches) => applySpec<UIBranches>({
  total: totalBranchesLens.get(),
  active: activeBranchesLens.get(),
  abandoned: abandonedBranchesLens.get(),
  possiblyConflicting: possiblyConflictingLens.get(),
  deleteCandidates: deleteCandidateBranchesLens.get()
})(branches);

export const setBranches = (branches: UIBranches) => pipe(
  totalBranchesLens.set(branches.total),
  activeBranchesLens.set(branches.active),
  abandonedBranchesLens.set(branches.abandoned),
  possiblyConflictingLens.set(branches.possiblyConflicting),
  deleteCandidateBranchesLens.set(branches.deleteCandidates)
);
