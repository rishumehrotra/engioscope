import { oneDayInMs, oneMonthInMs } from '../../shared/utils.js';
import { getConfig } from '../config.js';
import type { Release } from './mongoose-models/ReleaseEnvironment.js';
import { ReleaseModel } from './mongoose-models/ReleaseEnvironment.js';

export const getReleaseUpdateDates = (collectionName: string, project: string) =>
  ReleaseModel.aggregate<{ date: Date; id: number }>([
    {
      $match: {
        collectionName,
        project,
        modifiedOn: { $gt: new Date(oneDayInMs * 30 * 6) },
      },
    },
    {
      $project: {
        date: {
          $max: ['$environments.deploySteps.lastModifiedOn', '$modifiedOn', '$createdOn'],
        },
        id: '$id',
      },
    },
  ]);

export const getReleases = (
  collectionName: string,
  project: string,
  queryFrom = getConfig().azure.queryFrom
) =>
  ReleaseModel.aggregate<Release>([
    {
      $match: {
        collectionName,
        project,
        modifiedOn: { $gt: new Date(queryFrom.getTime() - oneMonthInMs) },
      },
    },
    {
      $addFields: {
        computedLastUpdate: {
          $max: ['$environments.deploySteps.lastModifiedOn', '$modifiedOn', '$createdOn'],
        },
      },
    },
    { $match: { computedLastUpdate: { $gt: queryFrom } } },
  ]);

export const getPipelinesCount = (
  collectionName: string,
  project: string,
  queryFrom = getConfig().azure.queryFrom
) =>
  ReleaseModel.aggregate<{ count: number }>([
    {
      $match: {
        collectionName,
        project,
        'environments.deploySteps.queuedOn': { $gt: queryFrom },
      },
    },
    { $group: { _id: '$releaseDefinitionId' } },
    { $count: 'count' },
  ]).then(result => result[0]?.count || 0);
