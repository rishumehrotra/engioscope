import { CodeCoverageModel } from '../models/mongoose-models/CodeCoverage';

export const createCoverage = (
  collectionName: string,
  project: string,
  buildId: number,
  covered = 5
) =>
  CodeCoverageModel.insertMany([
    {
      build: {
        id: buildId,
        url: 'https://example.com',
      },
      collectionName,
      project,
      coverageData: [
        {
          coverageStats: [
            {
              covered,
              delta: 0,
              isDeltaAvailable: true,
              label: 'Branches',
              position: 6,
              total: 10,
            },
            {
              covered,
              delta: 0,
              isDeltaAvailable: true,
              label: 'Lines',
              position: 4,
              total: 10,
            },
          ],
        },
      ],
    },
  ]);
