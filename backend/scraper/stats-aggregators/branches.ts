import type { UIBranches } from '../../../shared/types';
import type { GitBranchStats } from '../types-azure';
import { isWithinFortnight } from '../../utils';

const significantlyAheadLimit = 20;

export default (repoUrl: string, defaultBranch?: string) => (branches: GitBranchStats[]): UIBranches => {
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
    deleteCandidates: deleteCandidates.length > 0 ? deleteCandidates.length - 1 : 0, // accounting for master which is not behind itself
    possiblyConflicting: possiblyConflicting.length,
    significantlyAhead: {
      limit: significantlyAheadLimit,
      branches: significantlyAheadBranches.map(b => ({
        name: b.name,
        // TODO: defaultBranch can be undefined! Handle this better.
        // eslint-disable-next-line max-len
        url: defaultBranch ? `${repoUrl}/branches?targetVersion=GB${encodeURIComponent(b.name)}&baseVersion=GB${encodeURIComponent(defaultBranch.replace('refs/heads/', ''))}&_a=commits` : '',
        aheadBy: b.aheadCount,
        lastCommitDate: b.commit.committer.date
      }))
    }
  };
};

