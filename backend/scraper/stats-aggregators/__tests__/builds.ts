import { Build } from '../../types-azure';
import aggregateBuilds from '../builds';

test('aggregate-builds-by-repo', () => {
  const { buildByRepoId } = aggregateBuilds([
    {
      result: 'failed',
      finishTime: new Date('2021-10-10T10:10:10.000Z'),
      startTime: new Date('2021-10-10T10:09:10.000Z'),
      repository: { id: '1' },
      id: 123,
      definition: { id: 123 },
      sourceBranch: '/ref/heads/master'
    },
    {
      result: 'succeeded',
      finishTime: new Date('2021-10-09T10:11:10.000Z'),
      startTime: new Date('2021-10-09T10:09:10.000Z'),
      repository: { id: '2' },
      definition: { id: 123 },
      sourceBranch: '/ref/heads/master'
    },
    {
      result: 'failed',
      finishTime: new Date('2021-10-08T10:10:10.000Z'),
      startTime: new Date('2021-10-08T10:09:10.000Z'),
      repository: { id: '2' },
      definition: { id: 456 },
      sourceBranch: '/ref/heads/master'
    }
  ] as Build[]);

  expect(buildByRepoId('1')).toMatchSnapshot();
  expect(buildByRepoId('2')).toMatchSnapshot();
  expect(buildByRepoId('non-existant')).toMatchSnapshot();
});
