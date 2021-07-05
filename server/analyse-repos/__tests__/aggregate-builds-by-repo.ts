import { BuildResult } from 'azure-devops-node-api/interfaces/BuildInterfaces';
import { pastDate } from '../../utils';
import aggregateBuildsByRepo from '../aggregate-builds-by-repo';

test('aggregate-builds-by-repo', () => {
  const { buildByRepoId, buildByBuildId } = aggregateBuildsByRepo([
    {
      result: BuildResult.Failed,
      finishTime: new Date(),
      startTime: new Date(),
      repository: { id: '1' },
      id: 123
    },
    {
      result: BuildResult.Succeeded,
      finishTime: new Date(),
      startTime: pastDate('5 mins'),
      repository: { id: '2' }
    },
    {
      result: BuildResult.Failed,
      finishTime: new Date(),
      startTime: new Date(),
      repository: { id: '2' }
    }
  ]);

  expect(buildByRepoId('1')).toMatchSnapshot();
  expect(buildByRepoId('2')).toMatchSnapshot();
  expect(buildByRepoId('non-existant')).toMatchSnapshot();
  expect(buildByBuildId(123)?.id).toBe(123);
});
