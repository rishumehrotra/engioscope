import { collectionsAndProjects, getConfig } from '../config.js';
import { PullRequestModel } from '../models/mongoose-models/PullRequestModel.js';
import azure from '../scraper/network/azure.js';

const lazyOnce = <T>(fn: () => Promise<T>) => {
  let promise: Promise<unknown> | null = null;

  return () => {
    if (!promise) {
      promise = fn();
    }

    return promise;
  };
};

export const updatePullRequests = () => {
  const { getPRsAsChunks } = azure(getConfig());

  return Promise.all(
    collectionsAndProjects().map(
      async ([{ name: collectionName }, { name: project }]) => {
        const deleteOnce = lazyOnce(() =>
          PullRequestModel.deleteMany({ collectionName, project }).exec()
        );

        await getPRsAsChunks(collectionName, project, async prs => {
          return deleteOnce().then(() => {
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
        });
      }
    )
  );
};
