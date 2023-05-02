import type { Types } from 'mongoose';
import { getConnectionById, getConnections } from '../models/connections.js';
import type { SonarConnection } from '../models/mongoose-models/ConnectionModel.js';
import type { SonarProject } from '../models/mongoose-models/sonar-models.js';
import {
  SonarQualityGateUsedModel,
  SonarAlertHistoryModel,
  SonarMeasuresModel,
  SonarProjectModel,
} from '../models/mongoose-models/sonar-models.js';
import {
  getMeasures,
  getQualityGate,
  getQualityGateHistoryAsChunks,
  projectsAtSonarServer,
} from '../scraper/network/sonar2.js';
import { chunkArray, invokeSeries, pastDate } from '../utils.js';
import { collectionsAndProjects } from '../config.js';
import { RepositoryModel } from '../models/mongoose-models/RepositoryModel.js';
import { getMatchingSonarProjects, lastAlertHistoryFetchDate } from '../models/sonar.js';
import { latestBuildReportsForRepoAndBranch } from '../models/build-reports.js';
import { exists, oneDayInMs, oneHourInMs } from '../../shared/utils.js';
import { createSchedule } from './utils.js';

export const refreshSonarProjects = async () => {
  const sonarConnections = await getConnections('sonar');
  return Promise.all(
    sonarConnections.map(async conn => {
      const projects = await projectsAtSonarServer(conn);

      await SonarProjectModel.deleteMany({
        connectionId: conn._id,
        key: { $nin: projects.map(p => p.key) },
      });

      await SonarProjectModel.bulkWrite(
        projects.map(project => ({
          updateOne: {
            filter: { connectionId: conn._id, key: project.key },
            update: { $set: { connectionId: conn._id, ...project } },
            upsert: true,
          },
        }))
      );
    })
  );
};

export const saveMeasuresForProject = async (
  sonarProject: Pick<
    SonarProject & { _id: Types.ObjectId },
    'key' | '_id' | 'connectionId'
  >
) => {
  const connection = await getConnectionById<SonarConnection>(sonarProject.connectionId);
  const measures = await getMeasures(connection)(sonarProject);

  const doc = new SonarMeasuresModel({
    fetchDate: new Date(),
    measures,
    sonarProjectId: sonarProject._id,
  });
  return doc.save();
};

export const getMissingSonarMeasures = async () => {
  const [allProjects, existingProjectIds] = await Promise.all([
    SonarProjectModel.find({}, { _id: 1, connectionId: 1, key: 1 }).lean() as Promise<
      Pick<SonarProject & { _id: Types.ObjectId }, 'key' | '_id' | 'connectionId'>[]
    >,
    SonarMeasuresModel.distinct('sonarProjectId'),
  ]);

  const projectsToFetch = allProjects.filter(
    p => !existingProjectIds.toString().includes(p._id.toString())
  );

  return invokeSeries(projectsToFetch, saveMeasuresForProject);
};

export const updateQualityGateHistory =
  (collectionName: string, project: string) =>
  async (
    reposAndSonarProjects: {
      repoId: string;
      sonarProject: SonarProject & {
        _id: Types.ObjectId;
      };
    }[]
  ) => {
    const sonarConnections = await getConnections('sonar');

    return invokeSeries(chunkArray(reposAndSonarProjects, 10), async reposAndProjects => {
      return Promise.all(
        reposAndProjects.map(async ({ repoId, sonarProject }) => {
          const lastFetchDate = await lastAlertHistoryFetchDate({
            collectionName,
            project,
            repositoryId: repoId,
            sonarProjectId: sonarProject._id.toString(),
          });

          const sonarConnection = sonarConnections.find(c =>
            c._id.equals(sonarProject.connectionId)
          );

          if (!sonarConnection) return;

          await getQualityGateHistoryAsChunks(sonarConnection)(
            sonarProject,
            lastFetchDate,
            async historyItems => {
              const filteredHistoryItems = historyItems.filter(
                ({ date }) =>
                  new Date(date).getTime() >
                  (lastFetchDate || pastDate('365 days')).getTime()
              );

              await SonarAlertHistoryModel.bulkWrite(
                filteredHistoryItems.map(({ value, date }) => {
                  return {
                    updateOne: {
                      filter: {
                        collectionName,
                        project,
                        repositoryId: repoId,
                        sonarProjectId: sonarProject._id,
                        date: new Date(date),
                      },
                      update: { $set: { value } },
                      upsert: true,
                    },
                  };
                })
              );
            }
          );
        })
      );
    });
  };

const shouldUpdate = createSchedule({
  frequency: oneHourInMs,
  schedule: s => [
    s`For the first ${oneDayInMs}, check every ${oneHourInMs}.`,
    s`Then till ${3 * oneDayInMs}, check every ${3 * oneHourInMs}.`,
    s`Then till ${6 * oneDayInMs}, check every ${12 * oneHourInMs}.`,
    s`Then till ${18 * oneDayInMs}, check every ${oneDayInMs}.`,
    s`Then till ${33 * oneDayInMs}, check every ${2 * oneDayInMs}.`,
    s`Then till ${60 * oneDayInMs}, check every ${6 * oneDayInMs}.`,
    s`Then till ${90 * oneDayInMs}, check every ${10 * oneDayInMs}.`,
  ],
});

export const updateQualityGateDetails =
  (collectionName: string, project: string) =>
  async (
    reposAndSonarProjects: {
      repoId: string;
      sonarProject: SonarProject & {
        _id: Types.ObjectId;
      };
    }[]
  ) => {
    const sonarServers = await getConnections('sonar');

    return invokeSeries(chunkArray(reposAndSonarProjects, 10), async reposAndProjects => {
      return Promise.all(
        reposAndProjects.map(async ({ repoId, sonarProject }) => {
          const gateUsed = await SonarQualityGateUsedModel.findOne(
            {
              collectionName,
              project,
              repositoryId: repoId,
              sonarProjectId: sonarProject._id,
            },
            { updatedAt: 1 }
          ).exec();

          const isUpdateNeeded = gateUsed ? shouldUpdate(gateUsed.updatedAt) : true;

          if (!isUpdateNeeded) return;

          const sonarServer = sonarServers.find(s =>
            s._id.equals(sonarProject.connectionId)
          );

          if (!sonarServer) return;

          const qualityGate = await getQualityGate(sonarServer)(sonarProject);

          await SonarQualityGateUsedModel.updateOne(
            {
              collectionName,
              project,
              repositoryId: repoId,
              sonarProjectId: sonarProject._id,
            },
            { $set: { ...qualityGate, updatedAt: new Date() } },
            { upsert: true }
          );
        })
      );
    });
  };

export const onboardQuailtyGateHistory = async () => {
  return invokeSeries(
    collectionsAndProjects(),
    async ([{ name: collectionName }, { name: project }]) => {
      const repos = await RepositoryModel.find(
        { collectionName, 'project.name': project },
        { id: 1, name: 1, defaultBranch: 1 }
      );

      const sonarProjectsForRepoIds = await Promise.all(
        repos.map(async repo => {
          const sonarProjects = await getMatchingSonarProjects(
            repo.name,
            repo.defaultBranch,
            latestBuildReportsForRepoAndBranch(collectionName, project)
          );

          if (!sonarProjects) return null;
          return { repoId: repo.id, sonarProjects };
        })
      ).then(x =>
        x
          .filter(exists)
          .flatMap(({ repoId, sonarProjects }) =>
            sonarProjects.map(p => ({ repoId, sonarProject: p }))
          )
      );

      await Promise.all([
        updateQualityGateHistory(collectionName, project)(sonarProjectsForRepoIds),
        updateQualityGateDetails(collectionName, project)(sonarProjectsForRepoIds),
      ]);
    }
  );
};
