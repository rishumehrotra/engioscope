import { getConnections } from '../models/connections.js';
import { SonarProjectModel } from '../models/mongoose-models/sonar-models.js';
import { projectsAtSonarServer } from '../scraper/network/sonar2.js';

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
