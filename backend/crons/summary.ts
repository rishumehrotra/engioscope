import { collections, collectionsAndProjects } from '../config.js';
import { SummaryModel } from '../models/mongoose-models/SummaryModel.js';
import { getSummary } from '../models/repo-listing.js';
import { pastDate } from '../utils.js';

export const getAllProjects = () => {
  return collections().flatMap(({ name, projects }) =>
    projects.map(project => ({ collectionName: name, project: project.name }))
  );
};

export const insertSummarySnapshot = async (
  duration: '30 days' | '90 days' | '180 days'
) => {
  const endDate = new Date();
  const startDate = pastDate(duration);

  await Promise.all(
    collectionsAndProjects().map(
      async ([{ name: collectionName }, { name: project }]) => {
        const summary = await getSummary({ collectionName, project, startDate, endDate });
        return SummaryModel.updateOne(
          {
            collectionName,
            project,
            duration,
          },
          { $set: { collectionName, project, duration, ...summary } },
          { upsert: true }
        );
      }
    )
  );
};
