import { TestRunModel } from '../models/mongoose-models/TestRunModel.js';
import { generateRandomTestId } from './utils.js';

export const createTestRun = (
  collectionName: string,
  project: string,
  buildId: number,
  buildDefinitionId: number,
  totalTests = 10
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
          count: totalTests,
        },
      ],
      startedDate: new Date('2022-03-25'),
      state: 'Completed',
      totalTests,
      url: 'http://example.com/foo',
      webAccessUrl: 'https://example.com/foo',
    },
  ]);
};

export const getTestruns = (collectionName: string, project: string, buildId: number) =>
  TestRunModel.find({
    collectionName,
    'project.name': project,
    'buildConfiguration.id': buildId,
  });
