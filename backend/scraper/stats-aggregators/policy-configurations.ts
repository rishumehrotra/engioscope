import type { BranchPolicies } from '../../../shared/types';
import type { PolicyConfiguration } from '../types-azure';
import {
  isRequireMergeStrategyPolicy, isCommentRequirementsPolicy, isBuildPolicy,
  isWorkItemLinkingPolicy, isMinimumNumberOfReviewersPolicy
} from '../types-azure';

export default (policyConfigurations: PolicyConfiguration[]) => {
  const policyConfigByRepoAndBranch = policyConfigurations.reduce<Record<string /* repoId */, Record<string /* branch */, BranchPolicies>>>(
    (acc, policyConfiguration) => {
      if (policyConfiguration.isDeleted) return acc;
      if (!policyConfiguration.isEnabled) return acc;

      const addBranchPolicy = (repoId: string, branch: string, policy: BranchPolicies) => {
        acc[repoId] = acc[repoId] || {};
        acc[repoId][branch] = acc[repoId][branch] || {};
        acc[repoId][branch] = { ...acc[repoId][branch], ...policy };
      };

      if (isMinimumNumberOfReviewersPolicy(policyConfiguration)) {
        addBranchPolicy(
          policyConfiguration.settings.scope[0].repositoryId,
          policyConfiguration.settings.scope[0].refName,
          {
            minimumNumberOfReviewers: {
              count: policyConfiguration.settings.minimumApproverCount,
              isOptional: !policyConfiguration.isBlocking
            }
          }
        );
      } else if (isWorkItemLinkingPolicy(policyConfiguration)) {
        addBranchPolicy(
          policyConfiguration.settings.scope[0].repositoryId,
          policyConfiguration.settings.scope[0].refName,
          { workItemLinking: { isOptional: !policyConfiguration.isBlocking } }
        );
      } else if (isBuildPolicy(policyConfiguration)) {
        addBranchPolicy(
          policyConfiguration.settings.scope[0].repositoryId,
          policyConfiguration.settings.scope[0].refName,
          { builds: { isOptional: !policyConfiguration.isBlocking } }
        );
      } else if (isCommentRequirementsPolicy(policyConfiguration)) {
        addBranchPolicy(
          policyConfiguration.settings.scope[0].repositoryId,
          policyConfiguration.settings.scope[0].refName,
          { commentRequirements: { isOptional: !policyConfiguration.isBlocking } }
        );
      } else if (isRequireMergeStrategyPolicy(policyConfiguration)) {
        addBranchPolicy(
          policyConfiguration.settings.scope[0].repositoryId,
          policyConfiguration.settings.scope[0].refName,
          { requireMergeStrategy: { isOptional: !policyConfiguration.isBlocking } }
        );
      }

      return acc;
    },
    {}
  );

  return (repoId: string, branch: string) => (
    policyConfigByRepoAndBranch[repoId]?.[branch] || {}
  );
};
