import { collectionsAndProjects, getConfig } from '../config.js';
import { PullRequestModel } from '../models/mongoose-models/PullRequestModel.js';
import azure from '../scraper/network/azure.js';

export const updatePullRequests = () => {
  const { getPRsAsChunks } = azure(getConfig());

  return Promise.all(
    collectionsAndProjects().map(
      async ([{ name: collectionName }, { name: project }]) => {
        await PullRequestModel.deleteMany({ collectionName, project });

        await getPRsAsChunks(collectionName, project, prs => {
          return PullRequestModel.insertMany(
            prs.map(pr => {
              const { repository, createdBy, reviewers, ...rest } = pr;

              return {
                collectionName,
                project,
                repositoryId: repository.id,
                createdBy: {
                  displayName: createdBy.displayName,
                  id: createdBy.id,
                },
                reviewers: reviewers.map(r => ({
                  displayName: r.displayName,
                  id: r.id,
                })),
                ...rest,
              };
            })
          );
        });
      }
    )
  );
};
