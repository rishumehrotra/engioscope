import mongoose from 'mongoose';
import { z } from 'zod';
import { configForProject } from '../config.js';
import type { PolicyConfiguration as AzurePolicyConfiguration } from '../scraper/types-azure.js';

const { Schema, model } = mongoose;

type RepoPolicyBase = {
  collectionName: string;
  project: string;
  repositoryId: string;
  id: number;
  typeId: string;
  createdById: string;
  createdDate: Date;
  isEnabled: boolean;
  isBlocking: boolean;
  isDeleted: boolean;
};

type BranchPolicyBase = RepoPolicyBase & {
  refName: string;
};

type FileSizeRestrictionPolicy = RepoPolicyBase & {
  type: 'File size restriction';
  settings: {
    maximumGitBlobSizeInBytes: number;
    useUncompressedSize: boolean;
  };
};

type PathLengthRestrictionPolicy = RepoPolicyBase & {
  type: 'Path Length restriction';
  settings: {
    maxPathLength: number;
  };
};

type ReservedNamesRestrictionPolicy = RepoPolicyBase & {
  type: 'Reserved names restriction';
};

type MinimumNumberOfReviewersPolicy = BranchPolicyBase & {
  type: 'Minimum number of reviewers';
  settings: {
    minimumApproverCount: number;
    creatorVoteCounts: boolean;
    allowDownvotes: boolean;
    resetOnSourcePush: boolean;
  };
};

type CommentRequirementsPolicy = BranchPolicyBase & {
  type: 'Comment requirements';
};

type WorkItemLinkingPolicy = BranchPolicyBase & {
  type: 'Work item linking';
};

type BuildPolicy = BranchPolicyBase & {
  type: 'Build';
  settings: {
    buildDefinitionId: number;
    queueOnSourceUpdateOnly: boolean;
    manualQueueOnly: boolean;
    displayName: string | null;
    validDuration: number;
  };
};

type RequiredReviewersPolicy = BranchPolicyBase & {
  type: 'Required reviewers';
  settings: {
    requiredReviewerIds: string[];
    filenamePatterns?: string[];
  };
};

type RequireMergeStrategyPolicy = BranchPolicyBase & {
  type: 'Require a merge strategy';
  allowRebase?: boolean;
};

type BranchPolicy =
  | MinimumNumberOfReviewersPolicy
  | CommentRequirementsPolicy
  | WorkItemLinkingPolicy
  | BuildPolicy
  | RequiredReviewersPolicy
  | RequireMergeStrategyPolicy;

export type RepoPolicy =
  | FileSizeRestrictionPolicy
  | PathLengthRestrictionPolicy
  | ReservedNamesRestrictionPolicy
  | BranchPolicy;

const repoPolicySchema = new Schema<RepoPolicy>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  repositoryId: { type: String, required: true },
  id: { type: Number, required: true },
  typeId: { type: String, required: true },
  createdById: { type: String, required: true },
  createdDate: { type: Date, required: true },
  isEnabled: { type: Boolean, required: true },
  isBlocking: { type: Boolean, required: true },
  isDeleted: { type: Boolean, required: true },
  refName: { type: String },
  type: { type: String, required: true },
  settings: { type: Schema.Types.Mixed },
});

// For writes
repoPolicySchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
  id: 1,
});

// For reads
repoPolicySchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
  refName: 1,
});

const RepoPolicyModel = model<RepoPolicy>('RepoPolicy', repoPolicySchema);

const creatingRepoPoliciesCollection = RepoPolicyModel.createCollection();

type CombinedBranchPolicies = {
  _id: {
    collectionName: string;
    project: string;
    repositoryId: string;
    refName: string;
  };
  policies: Partial<{
    [key in BranchPolicy['type']]: {
      isEnabled: boolean;
      isBlocking: boolean;
      minimumApproverCount?: number;
      buildDefinitionId?: number;
    };
  }>;
};

const combinedBranchPoliciesSchema = new Schema({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  repositoryId: { type: String, required: true },
  refName: { type: String, required: true },
  policies: {},
});

combinedBranchPoliciesSchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
  refName: 1,
});

const CombinedBranchPoliciesModel = model<CombinedBranchPolicies>(
  'CombinedBranchPolicies',
  combinedBranchPoliciesSchema
);

export const refreshCombinedBranchPoliciesView = async () => {
  await CombinedBranchPoliciesModel.collection.drop();
  return CombinedBranchPoliciesModel.createCollection({
    viewOn: 'repopolicies',
    pipeline: [
      { $match: { isDeleted: false, refName: { $exists: 1 } } },
      {
        $group: {
          _id: {
            refName: '$refName',
            collectionName: '$collectionName',
            project: '$project',
            repositoryId: '$repositoryId',
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
    ],
  });
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises, unicorn/prefer-top-level-await
creatingRepoPoliciesCollection.then(refreshCombinedBranchPoliciesView);

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

export const getPolicyConfigurations = (collectionName: string, project: string) =>
  RepoPolicyModel.find({ collectionName, project }).lean();

export const conformsToBranchPolicies = async ({
  collectionName,
  project,
  repositoryId,
  refName,
}: {
  collectionName: string;
  project: string;
  repositoryId: string;
  refName: string;
}) => {
  const branchPolicies = configForProject(collectionName, project)?.branchPolicies;
  if (!branchPolicies) return;

  const match = await CombinedBranchPoliciesModel.findOne({
    collectionName,
    project,
    repositoryId,
    refName,
  }).lean();

  if (!match) return false;

  return Object.entries(branchPolicies).every(([p, policyConfig]) => {
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
};

export const branchPoliciesInputParser = z.object({
  collectionName: z.string(),
  project: z.string(),
  repositoryId: z.string(),
  refName: z.string(),
});

export const getBranchPolicies = (options: z.infer<typeof branchPoliciesInputParser>) => {
  return CombinedBranchPoliciesModel.findOne(options, { policies: 1 })
    .lean()
    .then(x => x?.policies || null);
};

export const deleteRepoPoliciesForRepoIds = (
  collectionName: string,
  project: string,
  ids: string[]
) => {
  return RepoPolicyModel.deleteMany({
    collectionName,
    project,
    repositoryId: { $in: ids },
  });
};

export const isFileSizeRestrictionPolicy = (
  policy: RepoPolicy
): policy is FileSizeRestrictionPolicy => policy.type === 'File size restriction';
export const isPathLengthRestrictionPolicy = (
  policy: RepoPolicy
): policy is PathLengthRestrictionPolicy => policy.type === 'Path Length restriction';
export const isReservedNamesRestrictionPolicy = (
  policy: RepoPolicy
): policy is ReservedNamesRestrictionPolicy =>
  policy.type === 'Reserved names restriction';
export const isMinimumNumberOfReviewersPolicy = (
  policy: RepoPolicy
): policy is MinimumNumberOfReviewersPolicy =>
  policy.type === 'Minimum number of reviewers';
export const isCommentRequirementsPolicy = (
  policy: RepoPolicy
): policy is CommentRequirementsPolicy => policy.type === 'Comment requirements';
export const isWorkItemLinkingPolicy = (
  policy: RepoPolicy
): policy is WorkItemLinkingPolicy => policy.type === 'Work item linking';
export const isBuildPolicy = (policy: RepoPolicy): policy is BuildPolicy =>
  policy.type === 'Build';
export const isRequiredReviewersPolicy = (
  policy: RepoPolicy
): policy is RequiredReviewersPolicy => policy.type === 'Required reviewers';
export const isRequireMergeStrategyPolicy = (
  policy: RepoPolicy
): policy is RequireMergeStrategyPolicy => policy.type === 'Require a merge strategy';
