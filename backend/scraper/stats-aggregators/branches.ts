import { UIBranches } from '../../../shared/types';
import { GitBranchStats } from '../types-azure';
import { isWithinFortnight } from '../../utils';

const significantlyAheadLimit = 20;

export default (branches: GitBranchStats[]): UIBranches => {
  const activeBranches = branches.filter(b => isWithinFortnight(b.commit.committer.date));
  const inActiveBranches = branches.filter(b => !isWithinFortnight(b.commit.committer.date));
  const abandonedBranches = inActiveBranches.filter(b => b.aheadCount > 0 && b.behindCount > 0);
  const deleteCandidates = branches.filter(b => b.behindCount === 0);
  const possiblyConflicting = branches.filter(b => b.aheadCount > 3 && b.behindCount > 10);
  const significantlyAheadBranches = branches
    .filter(b => b.aheadCount >= significantlyAheadLimit)
    .sort((a, b) => b.aheadCount - a.aheadCount);

  return {
    total: branches.length,
    active: activeBranches.length,
    abandoned: abandonedBranches.length,
    deleteCandidates: deleteCandidates.length,
    possiblyConflicting: possiblyConflicting.length,
    significantlyAhead: {
      limit: significantlyAheadLimit,
      branches: significantlyAheadBranches.map(b => ({
        name: b.name,
        aheadBy: b.aheadCount,
        lastCommitDate: b.commit.committer.date
      }))
    }
  };
};

