import type { ObjectId } from 'mongoose';
import { getConnectionById, getConnections } from '../models/connections.js';
import type { SonarConnection } from '../models/mongoose-models/ConnectionModel.js';
import type { SonarProject } from '../models/mongoose-models/sonar-models.js';
import {
  SonarMeasuresModel,
  SonarProjectModel,
} from '../models/mongoose-models/sonar-models.js';
import { getMeasures, projectsAtSonarServer } from '../scraper/network/sonar2.js';

export const refreshSonarProjects = async () => {
  const sonarConnections = await getConnections('sonar');
  return Promise.all(
    sonarConnections.map(async conn => {
      const projects = await projectsAtSonarServer(conn);

      await SonarProjectModel.deleteMany({ connectionId: conn._id });
      await SonarProjectModel.bulkWrite(
        projects.map(project => {
          return {
            insertOne: {
              document: {
                connectionId: conn._id,
                ...project,
              },
            },
          };
        })
      );
    })
  );
};

export const saveMeasuresForProject = async (
  sonarProject: SonarProject & { _id: ObjectId }
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
