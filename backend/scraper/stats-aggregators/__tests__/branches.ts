import { GitBranchStats } from '../../types-azure';
import { pastDate } from '../../../utils';
import aggregateBranches from '../branches';

test('aggregate-branches with a single old branch behind trunk', () => {
  expect(aggregateBranches([{
    aheadCount: 0,
    behindCount: 1,
    commit: { committer: { date: pastDate('25 days') } }
  }] as GitBranchStats[])).toMatchSnapshot();
});
