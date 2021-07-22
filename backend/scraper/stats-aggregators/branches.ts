import { UIBranches } from '../../../shared/types';
import { GitBranchStats } from '../types-azure';
import { isWithinFortnight } from '../../utils';

export default (branches: GitBranchStats[]): UIBranches => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const activeBranches = branches.filter(b => isWithinFortnight(b.commit.committer!.date!));
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const inActiveBranches = branches.filter(b => !isWithinFortnight(b.commit.committer!.date!));
  const abandonedBranches = inActiveBranches.filter(b => b.aheadCount > 0 && b.behindCount > 0);
  const deleteCandidates = branches.filter(b => b.behindCount === 0);
  const possiblyConflicting = branches.filter(b => b.aheadCount > 3 && b.behindCount > 10);

  return {
    total: branches.length,
    active: activeBranches.length,
    abandoned: abandonedBranches.length,
    deleteCandidates: deleteCandidates.length,
    possiblyConflicting: possiblyConflicting.length
  };
};

