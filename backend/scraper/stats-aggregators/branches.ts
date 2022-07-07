import {
  allPass, anyPass, complement, filter, pipe
} from 'rambda';
import type { UIBranches } from '../../../shared/types';
import type { GitBranchStats } from '../types-azure';
import {
  byDate, byNum, desc
} from '../../../shared/sort-utils';
import { oneFortnightInMs } from '../../../shared/utils';

const branchPageLimit = 20;

const commitDate = (b: GitBranchStats) => new Date(b.commit.committer.date);
const byCommitDate = byDate(commitDate);
const pageLimitBranches = (branches: GitBranchStats[]) => branches.slice(0, branchPageLimit);

const isActive = pipe(commitDate, d => Date.now() - d.getTime() < oneFortnightInMs);

const isBranchName = (branchName?: string) => (b: GitBranchStats) => (
  b.name === (branchName || '').replace('refs/heads/', '')
);

const isAheadBy = (num: number) => (b: GitBranchStats) => b.aheadCount > num;
const isBehindBy = (num: number) => (b: GitBranchStats) => b.behindCount > num;

const isTooAhead = isAheadBy(10);
const isNotTooAhead = complement(isTooAhead);
const isTooBehind = isBehindBy(10);
const isNotTooBehind = complement(isTooBehind);

const isBranchHealthy = (defaultBranch?: string) => anyPass([
  isBranchName(defaultBranch),
  allPass([isActive, isNotTooAhead, isNotTooBehind])
]);

export default (repoUrl: string, defaultBranch?: string) => (branches: GitBranchStats[]): UIBranches => {
  const allBranches = branches.sort(desc(byCommitDate));

  const healthy = filter(isBranchHealthy(defaultBranch));
  const unhealthy = filter(complement(isBranchHealthy(defaultBranch)));

  const healthyBranches = healthy(branches).sort(desc(byCommitDate));
  const unhealthyBranches = unhealthy(branches).sort(desc(byNum(b => b.aheadCount + b.behindCount)));

  const getBranchWithLink = (linkType: 'history' | 'contents') => (
    branch: GitBranchStats
  ) => ({
    name: branch.name,
    url: `${repoUrl}/?_a=${linkType}&targetVersion=GB${encodeURIComponent(branch.name)}`,
    aheadCount: branch.aheadCount,
    behindCount: branch.behindCount,
    lastCommitDate: branch.commit.committer.date
  });

  return {
    total: allBranches.length,
    healthy: {
      count: healthyBranches.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(healthyBranches).map(getBranchWithLink('contents'))
    },
    unhealthy: {
      count: unhealthyBranches.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(unhealthyBranches).map(getBranchWithLink('history'))
    }
  };
};
