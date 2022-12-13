import { model, Schema } from 'mongoose';
import type {
  Artifact as AzureArtifact, ArtifactType, DeploymentOperationStatus, DeploymentReason,
  DeploymentStatus, EnvironmentStatus, ReleaseReason, ReleaseStatus,
  Release as AzureRelease, ReleaseEnvironment as AzureReleaseEnvironment
} from '../scraper/types-azure.js';
import type { ReleaseCondition } from './release-definitions.js';

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
  // incomplete
};

export type Artifact = {
  sourceId: string;
  type: ArtifactType;
  alias: string;
  isPrimary: boolean;
  definition: {
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
  releaseDefinitionRevision: number;
  description: string;
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
  environments: [{
    id: { type: Number, required: true },
    releaseId: { type: Number, required: true },
    name: { type: String, required: true },
    status: { type: String, required: true },
    deploySteps: [{
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
      hasStarted: { type: Boolean, required: true }
    }]
  }]
});

releaseSchema.index({ collectionName: 1, project: 1, id: 1 });

const ReleaseModel = model<Release>('Release', releaseSchema);

const environmentFromAPI = (environment: AzureReleaseEnvironment): ReleaseEnvironment => {
  const { deploySteps, ...rest } = environment;
  return {
    deploySteps: deploySteps.map(d => {
      const {
        requestedBy, requestedFor, lastModifiedBy, ...rest
      } = d;
      return {
        ...rest,
        requestedById: requestedBy.id,
        requestedForId: requestedFor.id,
        lastModifiedById: lastModifiedBy.id
      };
    }),
    ...rest
  };
};

const artifactFromAPI = (artifact: AzureArtifact): Artifact => ({
  sourceId: artifact.sourceId,
  type: artifact.type,
  alias: artifact.alias,
  isPrimary: artifact.isPrimary,
  definition: {
    isTriggeringArtifact: artifact.definitionReference.IsTriggeringArtifact
      ? artifact.definitionReference.IsTriggeringArtifact.id === 'True'
      : undefined,
    buildPipelineUrl: artifact.definitionReference.artifactSourceDefinitionUrl?.id || undefined,
    buildUri: artifact.definitionReference.buildUri?.id || undefined,
    buildDefinitionId: artifact.definitionReference.definition?.id
      ? Number(artifact.definitionReference.definition.id)
      : undefined,
    branch: artifact.definitionReference.branch?.id || undefined,
    pullRequestId: artifact.definitionReference.pullRequestId?.id || undefined,
    pullRequestSourceBranch: artifact.definitionReference.pullRequestSourceBranch?.id || undefined,
    pullRequestSourceBranchCommitId: artifact.definitionReference.pullRequestSourceBranchCommitId?.id || undefined,
    pullRequestMergeCommitId: artifact.definitionReference.pullRequestMergeCommitId?.id || undefined,
    pullRequestTargetBranch: artifact.definitionReference.pullRequestTargetBranch?.id || undefined,
    requestedForId: artifact.definitionReference.requestedForId?.id || undefined
  }
});

export const bulkSaveRepositories = (collectionName: string) => (releases: AzureRelease[]) => (
  ReleaseModel.bulkWrite(releases.map(release => {
    const {
      projectReference, environments, artifacts, ...rest
    } = release;

    return {
      updateOne: {
        filter: {
          collectionName,
          id: release.id,
          project: projectReference.name
        },
        update: {
          $set: {
            ...rest,
            project: projectReference.name,
            environments: environments.map(environmentFromAPI),
            artifacts: artifacts.map(artifactFromAPI)
          }
        },
        upsert: true
      }
    };
  }))
);

export const getReleaseUpdateDates = (collectionName: string, project: string) => (
  ReleaseModel
    .aggregate([
      { $match: { collectionName, project } },
      {
        $project: {
          maxDate: { $max: '$environments.deploySteps.lastModifiedOn' },
          id: '$id'
        }
      }
    ])
);
