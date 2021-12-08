import type { BranchPolicy } from '../../../shared/types';
import type { PolicyConfiguration } from '../types-azure';
import {
  isRequireMergeStrategyPolicy,
  isCommentRequirementsPolicy, isBuildPolicy, isWorkItemLinkingPolicy, isMinimumNumberOfReviewersPolicy
} from '../types-azure';

export default (policyConfigurations: PolicyConfiguration[]) => {
  const policyConfigByRepoAndBranch = policyConfigurations.reduce<Record<string /* repoId */, Record<string /* branch */, BranchPolicy[]>>>(
    (acc, policyConfiguration) => {
      if (policyConfiguration.isDeleted) return acc;
      if (!policyConfiguration.isEnabled) return acc;

      const addBranchPolicy = (repoId: string, branch: string, policy: BranchPolicy) => {
        acc[repoId] = acc[repoId] || {};
        acc[repoId][branch] = acc[repoId][branch] || [];
        acc[repoId][branch].push(policy);
      };

      if (isMinimumNumberOfReviewersPolicy(policyConfiguration)) {
        addBranchPolicy(
          policyConfiguration.settings.scope[0].repositoryId,
          policyConfiguration.settings.scope[0].refName,
          {
            type: 'minimumNumberOfReviewers',
            minimumApproverCount: policyConfiguration.settings.minimumApproverCount,
            isOptional: !policyConfiguration.isBlocking
          }
        );
      } else if (isWorkItemLinkingPolicy(policyConfiguration)) {
        addBranchPolicy(
          policyConfiguration.settings.scope[0].repositoryId,
          policyConfiguration.settings.scope[0].refName,
          { type: 'workItemLinking', isOptional: !policyConfiguration.isBlocking }
        );
      } else if (isBuildPolicy(policyConfiguration)) {
        addBranchPolicy(
          policyConfiguration.settings.scope[0].repositoryId,
          policyConfiguration.settings.scope[0].refName,
          { type: 'builds', isOptional: !policyConfiguration.isBlocking }
        );
      } else if (isCommentRequirementsPolicy(policyConfiguration)) {
        addBranchPolicy(
          policyConfiguration.settings.scope[0].repositoryId,
          policyConfiguration.settings.scope[0].refName,
          { type: 'commentRequirements', isOptional: !policyConfiguration.isBlocking }
        );
      } else if (isRequireMergeStrategyPolicy(policyConfiguration)) {
        addBranchPolicy(
          policyConfiguration.settings.scope[0].repositoryId,
          policyConfiguration.settings.scope[0].refName,
          { type: 'requireMergeStrategy', isOptional: !policyConfiguration.isBlocking }
        );
      }

      return acc;
    },
    {}
  );

  return (repoId: string, branch: string) => (
    policyConfigByRepoAndBranch[repoId]?.[branch] || []
  );
};
