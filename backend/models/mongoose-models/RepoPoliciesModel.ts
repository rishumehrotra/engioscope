import { Schema, model } from 'mongoose';

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

export type FileSizeRestrictionPolicy = RepoPolicyBase & {
  type: 'File size restriction';
  settings: {
    maximumGitBlobSizeInBytes: number;
    useUncompressedSize: boolean;
  };
};
export type PathLengthRestrictionPolicy = RepoPolicyBase & {
  type: 'Path Length restriction';
  settings: {
    maxPathLength: number;
  };
};

export type ReservedNamesRestrictionPolicy = RepoPolicyBase & {
  type: 'Reserved names restriction';
};

export type MinimumNumberOfReviewersPolicy = BranchPolicyBase & {
  type: 'Minimum number of reviewers';
  settings: {
    minimumApproverCount: number;
    creatorVoteCounts: boolean;
    allowDownvotes: boolean;
    resetOnSourcePush: boolean;
  };
};

export type CommentRequirementsPolicy = BranchPolicyBase & {
  type: 'Comment requirements';
};

export type WorkItemLinkingPolicy = BranchPolicyBase & {
  type: 'Work item linking';
};

export type BuildPolicy = BranchPolicyBase & {
  type: 'Build';
  settings: {
    buildDefinitionId: number;
    queueOnSourceUpdateOnly: boolean;
    manualQueueOnly: boolean;
    displayName: string | null;
    validDuration: number;
  };
};

export type RequiredReviewersPolicy = BranchPolicyBase & {
  type: 'Required reviewers';
  settings: {
    requiredReviewerIds: string[];
    filenamePatterns?: string[];
  };
};

export type RequireMergeStrategyPolicy = BranchPolicyBase & {
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

export const RepoPolicyModel = model<RepoPolicy>('RepoPolicy', repoPolicySchema);

export type CombinedBranchPolicies = {
  collectionName: string;
  project: string;
  repositoryId: string;
  refName: string;
  conforms: boolean;
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
  conforms: { type: Boolean, required: true },
  policies: {},
});
combinedBranchPoliciesSchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
  refName: 1,
});

export const CombinedBranchPoliciesModel = model<CombinedBranchPolicies>(
  'CombinedBranchPolicies',
  combinedBranchPoliciesSchema
);
