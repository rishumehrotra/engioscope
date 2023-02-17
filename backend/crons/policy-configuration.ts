import { collectionsAndProjects, configForProject, getConfig } from '../config.js';
import type { CombinedBranchPolicies } from '../models/mongoose-models/RepoPoliciesModel.js';
import {
  CombinedBranchPoliciesModel,
  RepoPolicyModel,
} from '../models/mongoose-models/RepoPoliciesModel.js';
import azure from '../scraper/network/azure.js';
import type { PolicyConfiguration as AzurePolicyConfiguration } from '../scraper/types-azure.js';
import { runJob } from './utils.js';

export const bulkSavePolicies =
  (collectionName: string, project: string) => (policies: AzurePolicyConfiguration[]) =>
    RepoPolicyModel.bulkWrite(
      policies.map(p => {
        const {
          settings: { scope, ...settings },
          ...policy
        } = p;

        return {
          updateOne: {
            filter: {
              collectionName,
              project,
              repositoryId: scope[0].repositoryId,
              id: policy.id,
            },
            update: {
              $set: {
                typeId: policy.type.id,
                createdById: policy.createdBy.id,
                createdDate: policy.createdDate,
                isEnabled: policy.isEnabled,
                isDeleted: policy.isDeleted,
                isBlocking: policy.isBlocking,
                refName: 'refName' in scope[0] ? scope[0].refName : undefined,
                type: policy.type.displayName,
                settings,
              },
            },
            upsert: true,
          },
        };
      })
    );

export const refreshCombinedBranchPoliciesView = async () => {
  await CombinedBranchPoliciesModel.collection.drop();
  const results = RepoPolicyModel.aggregate<Omit<CombinedBranchPolicies, 'conforms'>>([
    { $match: { refName: { $exists: true }, isDeleted: false } },
    {
      $group: {
        _id: {
          collectionName: '$collectionName',
          project: '$project',
          repositoryId: '$repositoryId',
          refName: '$refName',
        },
        policies: {
          $push: {
            k: '$type',
            v: {
              isEnabled: '$isEnabled',
              isBlocking: '$isBlocking',
              minimumApproverCount: '$settings.minimumApproverCount',
              buildDefinitionId: '$settings.buildDefinitionId',
            },
          },
        },
      },
    },
    {
      $addFields: {
        policies: { $arrayToObject: '$policies' },
        collectionName: '$_id.collectionName',
        project: '$_id.project',
        repositoryId: '$_id.repositoryId',
        refName: '$_id.refName',
      },
    },
    { $unset: '_id' },
  ]);

  // eslint-disable-next-line no-restricted-syntax
  for await (const match of results) {
    const branchPolicies = configForProject(
      match.collectionName,
      match.project
    )?.branchPolicies;
    // eslint-disable-next-line no-continue
    if (!branchPolicies) continue;

    const conforms = Object.entries(branchPolicies).every(([p, policyConfig]) => {
      const policyName = p as keyof typeof match.policies;
      const matchingPolicy = match.policies[policyName];
      if (!matchingPolicy) return false;

      const isActive =
        matchingPolicy.isEnabled === policyConfig.isEnabled &&
        matchingPolicy.isBlocking === policyConfig.isBlocking;

      if (!isActive) return false;

      if (
        policyName === 'Minimum number of reviewers' &&
        'minimumApproverCount' in policyConfig
      ) {
        return (
          (matchingPolicy.minimumApproverCount || 0) >= policyConfig.minimumApproverCount
        );
      }

      return true;
    });

    await CombinedBranchPoliciesModel.create({
      ...match,
      conforms,
    });
  }
};

export const getPolicyConfigurations = async () => {
  const { getPolicyConfigurations } = azure(getConfig());

  await collectionsAndProjects().reduce<Promise<void>>(
    async (acc, [collection, project]) => {
      await acc;
      await getPolicyConfigurations(collection.name, project.name).then(
        bulkSavePolicies(collection.name, project.name)
      );
    },
    Promise.resolve()
  );

  return refreshCombinedBranchPoliciesView();
};

export default () =>
  runJob('fetching repo policies', t => t.every(3).days(), getPolicyConfigurations);
