import { Build } from '../../types-azure';
import { pastDate } from '../../../utils';
import aggregateBuilds from '../builds';

test('aggregate-builds-by-repo', () => {
  const { buildByRepoId } = aggregateBuilds([
    {
      result: 'failed',
      finishTime: new Date(),
      startTime: new Date(),
      repository: { id: '1' },
      id: 123,
      definition: { id: 123 }
    },
    {
      result: 'succeeded',
      finishTime: new Date(),
      startTime: pastDate('5 mins'),
      repository: { id: '2' },
      definition: { id: 123 }
    },
    {
      result: 'failed',
      finishTime: new Date(),
      startTime: new Date(),
      repository: { id: '2' },
      definition: { id: 456 }
    }
  ] as Build[]);

  expect(buildByRepoId('1')).toMatchSnapshot();
  expect(buildByRepoId('2')).toMatchSnapshot();
  expect(buildByRepoId('non-existant')).toMatchSnapshot();
});
