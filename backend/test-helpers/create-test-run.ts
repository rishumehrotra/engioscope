import { TestRunModel } from '../models/mongoose-models/TestRunModel.js';
import { generateRandomTestId } from './utils.js';

export const createTestRun = (
  collectionName: string,
  project: string,
  buildId: number,
  buildDefinitionId: number
) => {
  return TestRunModel.insertMany([
    {
      collectionName,
      id: generateRandomTestId(),
      project: {
        id: 'project-1',
        name: project,
      },
      buildConfiguration: {
        id: buildId,
        number: 'master_20230220.1',
        platform: '',
        buildDefinitionId,
        project: {
          name: 'project-1',
        },
      },
      completedDate: new Date('2022-03-25'),
      name: 'JUnit_TestResults_983411',
      revision: 0,
      runStatistics: [
        {
          state: 'Unspecified',
          outcome: 'Passed',
          count: 1,
        },
      ],
      startedDate: new Date('2022-03-25'),
      state: 'Completed',
      totalTests: 1,
      url: 'http://example.com/foo',
      webAccessUrl: 'https://example.com/foo',
    },
  ]);
};
