import type { Types } from 'mongoose';
import { getConnectionById, getConnections } from '../models/connections.js';
import type { SonarConnection } from '../models/mongoose-models/ConnectionModel.js';
import type { SonarProject } from '../models/mongoose-models/sonar-models.js';
import {
  SonarAlertHistoryModel,
  SonarMeasuresModel,
  SonarProjectModel,
} from '../models/mongoose-models/sonar-models.js';
import {
  getMeasures,
  getQualityGateHistoryAsChunks,
  projectsAtSonarServer,
} from '../scraper/network/sonar2.js';
import { chunkArray, pastDate } from '../utils.js';
import { collectionsAndProjects } from '../config.js';
import { RepositoryModel } from '../models/mongoose-models/RepositoryModel.js';
import { getMatchingSonarProjects } from '../models/sonar.js';
import { latestBuildReportsForRepoAndBranch } from '../models/build-reports.js';
import { exists } from '../../shared/utils.js';

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

  return projectsToFetch.reduce(async (acc, project) => {
    await acc;
    await saveMeasuresForProject(project);
  }, Promise.resolve());
};

export const updateQualityGateHistory =
  (collectionName: string, project: string) =>
  (
    reposAndSonarProjects: {
      repoId: string;
      sonarProjects: (SonarProject & {
        _id: Types.ObjectId;
      })[];
    }[]
  ) => {
    const repoAndProjectList = reposAndSonarProjects.flatMap(r => {
      return r.sonarProjects.map(p => ({ repoId: r.repoId, sonarProject: p }));
    });

    return chunkArray(repoAndProjectList, 10).reduce<Promise<unknown>>(
      async (acc, reposAndProjects) => {
        await acc;

        return Promise.all(
          reposAndProjects.map(async ({ repoId, sonarProject }) => {
            const matchingHistoryEntry = await SonarAlertHistoryModel.findOne(
              {
                collectionName,
                project,
                repositoryId: repoId,
                sonarProjectId: sonarProject._id,
              },
              { date: 1 },
              { sort: { date: -1 } }
            );

            const lastFetchDate = matchingHistoryEntry?.date;
            const sonarConnection = await getConnectionById<SonarConnection>(
              sonarProject.connectionId
            );

            await getQualityGateHistoryAsChunks(sonarConnection)(
              sonarProject,
              lastFetchDate,
              async historyItems => {
                const filteredHistoryItems = historyItems.filter(
                  ({ date }) =>
                    new Date(date).getTime() >
                    (lastFetchDate || pastDate('365 days')).getTime()
                );

                await SonarAlertHistoryModel.insertMany(
                  filteredHistoryItems.map(({ value, date }) => {
                    return {
                      collectionName,
                      project,
                      repositoryId: repoId,
                      sonarProjectId: sonarProject._id,
                      date: new Date(date),
                      value,
                    };
                  })
                );
              }
            );
          })
        );
      },
      Promise.resolve()
    );
  };

export const onboardQuailtyGateHistory = async () => {
  return collectionsAndProjects().reduce(
    async (acc, [{ name: collectionName }, { name: project }]) => {
      await acc;

      const repos = await RepositoryModel.find(
        { collectionName, 'project.name': project },
        { id: 1, name: 1, defaultBranch: 1 }
      );

      const somarProjectsForRepoIds = await Promise.all(
        repos.map(async repo => {
          const sonarProjects = await getMatchingSonarProjects(
            repo.name,
            repo.defaultBranch,
            latestBuildReportsForRepoAndBranch(collectionName, project)
          );

          if (!sonarProjects) return null;
          return { repoId: repo.id, sonarProjects };
        })
      ).then(x => x.filter(exists));

      await updateQualityGateHistory(collectionName, project)(somarProjectsForRepoIds);
    },
    Promise.resolve()
  );
};
