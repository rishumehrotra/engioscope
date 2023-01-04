import mongoose from 'mongoose';
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

type RepoPolicy =
  | FileSizeRestrictionPolicy
  | PathLengthRestrictionPolicy
  | ReservedNamesRestrictionPolicy
  | MinimumNumberOfReviewersPolicy
  | CommentRequirementsPolicy
  | WorkItemLinkingPolicy
  | BuildPolicy
  | RequiredReviewersPolicy
  | RequireMergeStrategyPolicy;

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
  settings: { type: Schema.Types.Mixed }
});

// For writes
repoPolicySchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
  id: 1
});

// For reads
repoPolicySchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
  refName: 1
});

const RepoPolicyModel = model<RepoPolicy>('RepoPolicy', repoPolicySchema);

export const bulkSavePolicies = (collectionName: string, project: string) => (
  (policies: AzurePolicyConfiguration[]) => (
    RepoPolicyModel.bulkWrite(policies.map(p => {
      const { settings: { scope, ...settings }, ...policy } = p;

      return {
        updateOne: {
          filter: {
            collectionName,
            project,
            repositoryId: scope[0].repositoryId,
            id: policy.id
          },
          update: {
            $set: {
              typeId: policy.type.id,
              createdById: policy.createdBy.id,
              createdDate: policy.createdDate,
              isEnabled: policy.isEnabled,
              isDeleted: policy.isDeleted,
              refName: 'refName' in scope[0] ? scope[0].refName : undefined,
              type: policy.type.displayName,
              settings
            }
          },
          upsert: true
        }
      };
    }))
  )
);
