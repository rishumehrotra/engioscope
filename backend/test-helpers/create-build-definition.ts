import { oneMinuteInMs, oneSecondInMs } from '../../shared/utils.js';
import { BuildDefinitionModel } from '../models/mongoose-models/BuildDefinitionModel.js';

export const createLatestBuildForDefinition = (
  buildId: number,
  finishTime: Date,
  status = 'completed',
  result = 'succeeded',
  buildDuration = 2 * oneMinuteInMs
) => {
  const startTime = new Date(finishTime);
  startTime.setTime(finishTime.getTime() - buildDuration);

  const queueTime = new Date(finishTime);
  startTime.setTime(finishTime.getTime() - buildDuration - 30 * oneSecondInMs);

  return {
    id: buildId,
    status,
    result,
    queueTime,
    startTime,
    finishTime,
  };
};

export const createBuildDefinition = (
  collectionName: string,
  project: string,
  buildDefinitionId: number,
  repositoryId: string,
  isYaml?: boolean,
  latestBuild = createLatestBuildForDefinition(buildDefinitionId, new Date('2022-03-25')),
  latestCompletedBuild = createLatestBuildForDefinition(
    buildDefinitionId,
    new Date('2022-03-25')
  )
) => {
  return BuildDefinitionModel.insertMany([
    {
      collectionName,
      project,
      id: buildDefinitionId,
      name: 'build def 1',
      url: 'http://foo.bar',
      projectId: 'project-1',
      repositoryId,
      createdDate: new Date('2020-01-01'),
      queueStatus: 'enabled',
      revision: '123',
      type: 'build',
      uri: 'vstfs://foo.bar',
      latestBuild,
      latestCompletedBuild,
      process: isYaml ? { processType: 2, yamlFilename: 'foo.yaml' } : { processType: 1 },
    },
  ]);
};
