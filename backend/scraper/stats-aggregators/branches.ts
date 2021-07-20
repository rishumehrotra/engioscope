import { TopLevelIndicator } from '../../../shared/types';
import { GitBranchStats } from '../types-azure';
import { isWithinFortnight } from '../../utils';

export default (branches: GitBranchStats[]): TopLevelIndicator => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const activeBranches = branches.filter(b => isWithinFortnight(b.commit.committer!.date!));
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const inActiveBranches = branches.filter(b => !isWithinFortnight(b.commit.committer!.date!));
  const staleBranches = inActiveBranches.filter(b => b.aheadCount === 0 && b.behindCount > 0);
  const abandonedBranches = inActiveBranches.filter(b => b.aheadCount > 0 && b.behindCount > 0);
  const deleteCandidates = inActiveBranches.filter(b => b.aheadCount === 0 && b.behindCount === 0);

  return {
    name: 'Branches',
    count: branches.length,
    indicators: [
      {
        name: 'Total',
        value: branches.length,
        tooltip: 'Total numbers of branches in the repository'
      },
      {
        name: 'Active',
        value: activeBranches.length,
        tooltip: 'Active development branches which are in-sync with master'
      },
      {
        name: 'Stale',
        value: staleBranches.length,
        tooltip: 'Inactive development branches which are out-of-sync with master'
      },
      {
        name: 'Abandoned',
        value: abandonedBranches.length,
        tooltip: 'Inactive development branches which are out-of-sync with master, but contain commits which are not present on master'
      },
      {
        name: 'Delete candidates',
        value: deleteCandidates.length,
        tooltip: 'Inactive development branches which are in-sync with master'
      }
    ]
  };
};

