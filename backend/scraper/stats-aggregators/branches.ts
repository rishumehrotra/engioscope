import { TopLevelIndicator } from '../../../shared-types';
import { GitBranchStats } from '../types-azure';
import { ratingConfig } from '../rating-config';
import { isWithinFortnight } from '../../utils';
import { withOverallRating } from './ratings';

export default (branches: GitBranchStats[]): TopLevelIndicator => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const activeBranches = branches.filter(b => isWithinFortnight(b.commit.committer!.date!));
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const inActiveBranches = branches.filter(b => !isWithinFortnight(b.commit.committer!.date!));
  const staleBranches = inActiveBranches.filter(b => b.aheadCount === 0 && b.behindCount > 0);
  const abandonedBranches = inActiveBranches.filter(b => b.aheadCount > 0 && b.behindCount > 0);
  const deleteCandidates = inActiveBranches.filter(b => b.aheadCount === 0 && b.behindCount === 0);

  return withOverallRating({
    name: 'Branches',
    count: branches.length,
    indicators: [
      {
        name: 'Total',
        value: branches.length,
        tooltip: 'Total numbers of branches in the repository',
        rating: ratingConfig.branches.total(branches.length)
      },
      {
        name: 'Active',
        value: activeBranches.length,
        tooltip: 'Active development branches which are in-sync with master',
        rating: ratingConfig.branches.active(activeBranches.length)
      },
      {
        name: 'Stale',
        value: staleBranches.length,
        tooltip: 'Inactive development branches which are out-of-sync with master',
        rating: ratingConfig.branches.stale(staleBranches.length)
      },
      {
        name: 'Abandoned',
        value: abandonedBranches.length,
        tooltip: 'Inactive development branches which are out-of-sync with master, but contain commits which are not present on master',
        rating: ratingConfig.branches.abandoned(abandonedBranches.length)
      },
      {
        name: 'Delete candidates',
        value: deleteCandidates.length,
        tooltip: 'Inactive development branches which are in-sync with master',
        rating: ratingConfig.branches.deleteCandidates(deleteCandidates.length)
      }
    ]
  });
};

