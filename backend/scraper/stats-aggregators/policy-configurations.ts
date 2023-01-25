import type { BranchPolicies } from '../../../shared/types.js';
import type { RepoPolicy } from '../../models/policy-configuration.js';
import {
  isRequireMergeStrategyPolicy,
  isCommentRequirementsPolicy,
  isBuildPolicy,
  isWorkItemLinkingPolicy,
  isMinimumNumberOfReviewersPolicy,
} from '../../models/policy-configuration.js';

type RepoId = string;
type BranchName = string;

export default (policyConfigurations: RepoPolicy[]) => {
  const policyConfigByRepoAndBranch = policyConfigurations.reduce<
    Record<RepoId, Record<BranchName, BranchPolicies>>
  >((acc, policyConfiguration) => {
    if (policyConfiguration.isDeleted) return acc;
    if (!policyConfiguration.isEnabled) return acc;

    const addBranchPolicy = (repoId: string, branch: string, policy: BranchPolicies) => {
      acc[repoId] = acc[repoId] || {};
      acc[repoId][branch] = acc[repoId][branch] || {};
      acc[repoId][branch] = { ...acc[repoId][branch], ...policy };
    };

    if (isMinimumNumberOfReviewersPolicy(policyConfiguration)) {
      addBranchPolicy(policyConfiguration.repositoryId, policyConfiguration.refName, {
        minimumNumberOfReviewers: {
          count: policyConfiguration.settings.minimumApproverCount,
          isOptional: !policyConfiguration.isBlocking,
        },
      });
    } else if (isWorkItemLinkingPolicy(policyConfiguration)) {
      addBranchPolicy(policyConfiguration.repositoryId, policyConfiguration.refName, {
        workItemLinking: { isOptional: !policyConfiguration.isBlocking },
      });
    } else if (isBuildPolicy(policyConfiguration)) {
      addBranchPolicy(policyConfiguration.repositoryId, policyConfiguration.refName, {
        builds: { isOptional: !policyConfiguration.isBlocking },
      });
    } else if (isCommentRequirementsPolicy(policyConfiguration)) {
      addBranchPolicy(policyConfiguration.repositoryId, policyConfiguration.refName, {
        commentRequirements: { isOptional: !policyConfiguration.isBlocking },
      });
    } else if (isRequireMergeStrategyPolicy(policyConfiguration)) {
      addBranchPolicy(policyConfiguration.repositoryId, policyConfiguration.refName, {
        requireMergeStrategy: { isOptional: !policyConfiguration.isBlocking },
      });
    }

    return acc;
  }, {});

  return (repoId: string, branch: string) =>
    policyConfigByRepoAndBranch[repoId]?.[branch] || {};
};
