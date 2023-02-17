import { z } from 'zod';
import { configForProject } from '../config.js';
import type {
  RepoPolicy,
  FileSizeRestrictionPolicy,
  PathLengthRestrictionPolicy,
  ReservedNamesRestrictionPolicy,
  MinimumNumberOfReviewersPolicy,
  CommentRequirementsPolicy,
  WorkItemLinkingPolicy,
  BuildPolicy,
  RequiredReviewersPolicy,
  RequireMergeStrategyPolicy,
} from './mongoose-models/RepoPoliciesModel.js';
import {
  CombinedBranchPoliciesModel,
  RepoPolicyModel,
} from './mongoose-models/RepoPoliciesModel.js';

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

  const match = await CombinedBranchPoliciesModel.findOne(
    {
      collectionName,
      project,
      repositoryId,
      refName,
    },
    { conforms: 1 }
  ).lean();

  if (!match) return false;

  return match.conforms;
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
