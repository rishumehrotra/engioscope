import { model, Schema } from 'mongoose';
import type {
  PullRequestAsyncStatus,
  PullRequestStatus,
} from '../../scraper/types-azure.js';

export type PullRequest = {
  collectionName: string;
  project: string;
  repositoryId: string;
  pullRequestId: number;
  codeReviewId: number;
  status: PullRequestStatus;
  createdBy: {
    diisplayName: string;
    id: string;
  };
  creationDate: Date;
  closedDate?: Date;
  title: string;
  description?: string;
  sourceRefName: string;
  targetRefName: string;
  mergeStatus?: PullRequestAsyncStatus;
  isDraft: boolean;
  mergeId: string;
  reviewers: {
    displayName: string;
    id: string;
  }[];
  url: string;
  supportsIterations?: boolean;
};

const pullRequestSchema = new Schema<PullRequest>(
  {
    collectionName: { type: String, required: true },
    project: { type: String, required: true },
    repositoryId: { type: String, required: true },
    pullRequestId: { type: Number, required: true },
    codeReviewId: { type: Number, required: true },
    status: { type: String, required: true },
    createdBy: {
      displayName: { type: String, required: true },
      id: { type: String, required: true },
    },
    creationDate: { type: Date, required: true },
    closedDate: { type: Date },
    title: { type: String, required: true },
    description: { type: String },
    sourceRefName: { type: String, required: true },
    targetRefName: { type: String, required: true },
    mergeStatus: { type: String },
    isDraft: { type: Boolean, required: true },
    mergeId: { type: String, required: true },
    reviewers: [
      {
        displayName: { type: String, required: true },
        id: { type: String, required: true },
      },
    ],
    url: { type: String, required: true },
    supportsIterations: { type: Boolean },
  },
  { timestamps: true }
);

pullRequestSchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
});

export const PullRequestModel = model<PullRequest>('PullRequest', pullRequestSchema);
