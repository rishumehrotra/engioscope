import {
  allPass, anyPass, complement, compose, filter, not, pipe
} from 'rambda';
import type { UIBranches } from '../../../shared/types.js';
import type { GitBranchStats } from '../types-azure.js';
import {
  asc, byDate, byNum, desc
} from '../../../shared/sort-utils.js';
import { oneFortnightInMs } from '../../../shared/utils.js';

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

const isDeleteCandidate = (defaultBranch?: string) => allPass([
  compose(not, isBranchHealthy(defaultBranch)),
  compose(not, isActive),
  compose(not, isAheadBy(0))
]);

const isAbandoned = (defaultBranch?: string) => allPass([
  compose(not, isBranchHealthy(defaultBranch)),
  compose(not, isActive),
  isAheadBy(0),
  isBehindBy(0)
]);

const isUnhealthy = (defaultBranch?: string) => complement(anyPass([
  isBranchHealthy(defaultBranch),
  isDeleteCandidate(defaultBranch),
  isAbandoned(defaultBranch)
]));

export default (repoUrl: string, defaultBranch?: string) => (branches: GitBranchStats[]): UIBranches => {
  const allBranches = branches.sort(desc(byCommitDate));

  const healthy = filter(isBranchHealthy(defaultBranch));
  const deleteCandidates = filter(isDeleteCandidate(defaultBranch));
  const abandoned = filter(isAbandoned(defaultBranch));
  const unhealthy = filter(isUnhealthy(defaultBranch));

  const healthyBranches = healthy(branches).sort(desc(byCommitDate));
  const deleteCandidateBranches = deleteCandidates(branches).sort(asc(byCommitDate));
  const abandonedBranches = abandoned(branches).sort(asc(byCommitDate));
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
    listingUrl: `${repoUrl}/branches?_a=all`,
    healthy: {
      count: healthyBranches.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(healthyBranches).map(getBranchWithLink('contents'))
    },
    deleteCandidates: {
      count: deleteCandidateBranches.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(deleteCandidateBranches).map(getBranchWithLink('history'))
    },
    abandoned: {
      count: abandonedBranches.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(abandonedBranches).map(getBranchWithLink('history'))
    },
    unhealthy: {
      count: unhealthyBranches.length,
      limit: branchPageLimit,
      branches: pageLimitBranches(unhealthyBranches).map(getBranchWithLink('history'))
    }
  };
};
