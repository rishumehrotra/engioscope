import { model, Schema } from 'mongoose';
import type {
  ArtifactType,
  DeploymentOperationStatus,
  DeploymentReason,
  DeploymentStatus,
  EnvironmentStatus,
  ReleaseReason,
  ReleaseStatus,
} from '../../scraper/types-azure.js';
import type { ReleaseCondition } from '../release-definitions.js';

export type DeploymentAttempt = {
  id: number;
  deploymentId: number;
  attempt: number;
  reason: DeploymentReason;
  status: DeploymentStatus;
  operationStatus: DeploymentOperationStatus;
  // releaseDeploymentPhases: ReleaseDeployPhase[]
  requestedById: string;
  requestedForId: string;
  queuedOn: Date;
  lastModifiedById: string;
  lastModifiedOn: Date;
  hasStarted: boolean;
};

export type ReleaseEnvironment = {
  id: number;
  releaseId: number;
  name: string;
  status: EnvironmentStatus;
  deploySteps: DeploymentAttempt[];
  rank: number;
  definitionEnvironmentId: number;
  conditions: ReleaseCondition[];
};

export type Artifact = {
  sourceId: string;
  type: ArtifactType;
  alias: string;
  isPrimary: boolean;
  definition?: {
    isTriggeringArtifact?: boolean;
    buildPipelineUrl?: string;
    buildUri?: string;
    buildDefinitionId?: number;
    branch?: string;
    pullRequestId?: string;
    pullRequestSourceBranch?: string;
    pullRequestSourceBranchCommitId?: string;
    pullRequestMergeCommitId?: string;
    pullRequestTargetBranch?: string;
    requestedForId?: string;
    repositoryName?: string;
    repositoryId?: string;
    connectionId?: string;
    connectionName?: string;
  };
};

export type Release = {
  collectionName: string;
  project: string;
  id: number;
  name: string;
  status: ReleaseStatus;
  createdOn: Date;
  modifiedOn: Date;
  modifiedById: string;
  createdById: string;
  environments: ReleaseEnvironment[];
  artifacts: Artifact[];
  releaseDefinitionId: number;
  releaseDefinitionName: string;
  releaseDefinitionUrl: string;
  releaseDefinitionRevision: number;
  description?: string;
  reason: ReleaseReason;
  releaseNameFormat: string;
  keepForever: boolean;
  definitionSnapshotRevision: number;
  logsContainerUrl: string;
  url: string;
};
const releaseSchema = new Schema<Release>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  id: { type: Number, required: true },
  name: { type: String, required: true },
  status: { type: String, required: true },
  createdOn: { type: Date, required: true },
  modifiedOn: { type: Date, required: true },
  createdById: { type: String, required: true },
  modifiedById: { type: String, required: true },
  environments: [
    {
      id: { type: Number, required: true },
      releaseId: { type: Number, required: true },
      name: { type: String, required: true },
      status: { type: String, required: true },
      deploySteps: [
        {
          id: { type: Number, required: true },
          deploymentId: { type: Number, required: true },
          attempt: { type: Number, required: true },
          reason: { type: String, required: true },
          status: { type: String, required: true },
          operationStatus: { type: String, required: true },
          requestedById: { type: String, required: true },
          requestedForId: { type: String, required: true },
          queuedOn: { type: Date, required: true },
          lastModifiedById: { type: String, required: true },
          lastModifiedOn: { type: Date, required: true },
          hasStarted: { type: Boolean, required: true },
        },
      ],
      rank: { type: Number, required: true },
      definitionEnvironmentId: { type: Number, required: true },
      conditions: [
        {
          conditionType: { type: String, required: true },
          name: { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
    },
  ],
  artifacts: [
    {
      sourceId: { type: String, required: true },
      type: { type: String, required: true },
      alias: { type: String, required: true },
      isPrimary: { type: Boolean, required: true },
      definition: {
        isTriggeringArtifact: { type: Boolean },
        buildPipelineUrl: { type: String },
        buildUri: { type: String },
        buildDefinitionId: { type: Number },
        branch: { type: String },
        pullRequestId: { type: String },
        pullRequestSourceBranch: { type: String },
        pullRequestSourceBranchCommitId: { type: String },
        pullRequestMergeCommitId: { type: String },
        pullRequestTargetBranch: { type: String },
        requestedForId: { type: String },
        repositoryId: { type: String },
        repositoryName: { type: String },
        connectionId: { type: String },
        connectionName: { type: String },
      },
    },
  ],
  releaseDefinitionRevision: { type: Number, required: true },
  releaseDefinitionId: { type: Number, required: true },
  releaseDefinitionName: { type: String, required: true },
  releaseDefinitionUrl: { type: String, required: true },
  description: { type: String },
  reason: { type: String, required: true },
  releaseNameFormat: { type: String, required: true },
  keepForever: { type: Boolean, required: true },
  definitionSnapshotRevision: { type: Number, required: true },
  logsContainerUrl: { type: String, required: true },
  url: { type: String, required: true },
});
releaseSchema.index({ collectionName: 1, project: 1, id: 1 });
releaseSchema.index({ collectionName: 1, project: 1, releaseDefinitionId: 1 });

export const ReleaseModel = model<Release>('Release', releaseSchema);
