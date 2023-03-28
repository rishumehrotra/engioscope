import { oneMinuteInMs, oneSecondInMs } from '../../shared/utils.js';
import { BuildModel } from '../models/mongoose-models/BuildModel.js';

export const createBuild = (
  collectionName: string,
  project: string,
  repoId: string,
  buildId: number,
  buildDefinitionId: number,
  finishTime = new Date('2022-03-25'),
  buildDuration = 2 * oneMinuteInMs
) => {
  const startTime = new Date(finishTime);
  startTime.setTime(finishTime.getTime() - buildDuration);

  const queueTime = new Date(finishTime);
  startTime.setTime(finishTime.getTime() - buildDuration - 30 * oneSecondInMs);

  return BuildModel.insertMany([
    {
      id: buildId,
      collectionName,
      project,
      repository: {
        id: repoId,
        name: 'repo-1',
      },
      buildNumber: `build-${buildId}`,
      buildNumberRevision: 1,
      definition: { id: buildDefinitionId, name: 'build def 1', url: 'http://foo.bar' },
      finishTime,
      queueTime,
      reason: 'manual',
      result: 'succeeded',
      sourceBranch: 'refs/heads/master',
      sourceVersion: 'some-string',
      startTime,
      status: 'completed',
      uri: 'vstfs://Build/Build/123',
      url: 'http://example.com/foo/bar',
    },
  ]);
};
