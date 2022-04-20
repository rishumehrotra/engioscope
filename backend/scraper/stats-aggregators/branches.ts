import { prop } from 'rambda';
import type { UIBranches } from '../../../shared/types';
import type { GitBranchStats } from '../types-azure';
import { isWithinFortnight } from '../../utils';
import {
  asc, byDate, byNum, desc
} from '../../../shared/sort-utils';

const branchPageLimit = 20;

const pageLimitBranches = (branches: GitBranchStats[]) => branches.slice(0, branchPageLimit);
const byCommitDate = byDate<GitBranchStats>(x => x.commit.committer.date);

export default (repoUrl: string, defaultBranch?: string) => (branches: GitBranchStats[]): UIBranches => {
  const allBranches = branches.sort(desc(byCommitDate));
  const activeBranches = branches
    .filter(b => isWithinFortnight(b.commit.committer.date))
    .sort(desc(byCommitDate));
  const inActiveBranches = branches
    .filter(b => !isWithinFortnight(b.commit.committer.date));
  const abandonedBranches = inActiveBranches
    .filter(b => b.aheadCount > 0 && b.behindCount > 0)
    .sort(asc(byCommitDate));
  const deleteCandidates = branches
    .filter(b => b.behindCount === 0 && b.name !== (defaultBranch ?? '').replace('refs/heads/', ''))
    .sort(asc(byCommitDate));
  const possiblyConflicting = branches
    .filter(b => b.aheadCount > 3 && b.behindCount > 10)
    .sort(desc(byCommitDate));
  const significantlyAheadBranches = branches
    .filter(b => b.aheadCount >= 20)
    .sort(desc(byNum(prop('aheadCount'))));

  const getBranchWithLink = (linkType: 'history' | 'contents') => (
    branch: GitBranchStats
  ) => ({
    name: branch.name,
    url: `${repoUrl}/?_a=${linkType}&targetVersion=GB${encodeURIComponent(branch.name)}`,
    lastCommitDate: branch.commit.committer.date
  });

  return {
    total: {
      count: allBranches.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(allBranches).map(getBranchWithLink('contents'))
    },
    active: {
      count: activeBranches.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(activeBranches).map(getBranchWithLink('contents'))
    },
    abandoned: {
      count: abandonedBranches.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(abandonedBranches).map(getBranchWithLink('history'))
    },
    deleteCandidates: {
      count: deleteCandidates.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(deleteCandidates).map(getBranchWithLink('contents'))
    },
    possiblyConflicting: {
      count: possiblyConflicting.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(possiblyConflicting).map(getBranchWithLink('contents'))
    },
    significantlyAhead: {
      count: significantlyAheadBranches.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(significantlyAheadBranches).map(b => ({
        name: b.name,
        // TODO: Handle the default branch being undefined case better.
        url: defaultBranch
          // eslint-disable-next-line max-len
          ? `${repoUrl}/branches?targetVersion=GB${encodeURIComponent(b.name)}&baseVersion=GB${encodeURIComponent(defaultBranch.replace('refs/heads/', ''))}&_a=commits`
          : '',
        aheadBy: b.aheadCount,
        lastCommitDate: b.commit.committer.date
      }))
    }
  };
};

