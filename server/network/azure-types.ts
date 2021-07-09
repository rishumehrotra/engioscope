export type ProjectState = 'all' | 'createPending' | 'deleted' | 'deleting' | 'new' | 'unchanged' | 'wellFormed';
export type ProjectVisibility = 'private' | 'public';
export type DefinitionTypeStatus = 'disabled' | 'enabled' | 'paused';
export type DefinitionType = 'build' | 'xaml';
export type BuildStatus = 'all' | 'cancelling' | 'completed' | 'inProgress' | 'none' | 'notStarted' | 'postponed';
export type BuildResult = 'canceled' | 'failed' | 'none' | 'partiallySucceeded' | 'succeeded';
export type QueuePriority = 'aboveNormal' | 'belowNormal' | 'high' | 'low' | 'normal';
export type BuildReason = 'all' | 'batchedCI' | 'buildCompletion' | 'checkInShelveset'
| 'individualCI' | 'manual' | 'none' | 'pullRequest' | 'schedule' | 'scheduleForced'
| 'triggered' | 'userCreated' | 'validateShelveset';
export type ReleaseStatus = 'abandoned' | 'active' | 'draft' | 'undefined';
export type ReleaseReason = 'continuousIntegration' | 'manual' | 'none' | 'pullRequest' | 'schedule';
export type EnvironmentStatus = 'canceled' | 'inProgress' | 'notStarted'
| 'partiallySucceeded' | 'queued' | 'rejected' | 'scheduled' | 'succeeded' | 'undefined';
export type DeploymentReason = 'automated' | 'manual' | 'none' | 'redeployTrigger' | 'scheduled';
export type DeploymentStatus = 'all' | 'failed' | 'inProgress' | 'notDeployed' | 'partiallySucceeded' | 'succeeded' | 'undefined';
export type DeploymentOperationStatus = 'All' | 'Approved' | 'Canceled' | 'Cancelling'
| 'Deferred' | 'EvaluatingGates' | 'GateFailed' | 'ManualInterventionPending'
| 'Pending' | 'PhaseCanceled' | 'PhaseFailed' | 'PhaseInProgress'
| 'PhasePartiallySucceeded' | 'PhaseSucceeded' | 'Queued' | 'QueuedForAgent'
| 'QueuedForPipeline' | 'Rejected' | 'Scheduled' | 'Undefined';
export type PullRequestStatus = 'abandoned' | 'active' | 'all' | 'completed' | 'notSet';
export type PullRequestAsyncStatus = 'conflicts' | 'failure' | 'notSet' | 'queued' | 'rejectedByPolicy' | 'succeeded';
export type GitPullRequestMergeStrategy = 'noFastForward' | 'rebase' | 'rebaseMerge' | 'squash';

export type TeamProjectReference = {
  id: string,
  name: string,
  description?: string,
  url?: string,
  state: ProjectState,
  revision?: number,
  visibility: ProjectVisibility,
  lastUpdatedTime: Date
};

export type DefinitionReference = {
  createdDate?: Date,
  id: number,
  name: string,
  path: string,
  project: TeamProjectReference,
  queueStatus: DefinitionTypeStatus,
  revision: number,
  type: DefinitionType,
  uri: string,
  url: string
};

export type IdentityRef = {
  displayName: string;
  url: string;
  id: string;
  uniqueName: string;
  imageUrl: string;
  descriptor: string;
};

export type AgentPoolQueue = {
  id: number,
  name: string,
  pool: {
    id: number,
    name: string
  }
};

export type GitRepository = {
  id: string,
  name: string,
  url: string,
  defaultBranch: string,
  size: number,
  remoteUrl: string,
  sshUrl: string,
  webUrl: string,
  project: TeamProjectReference
};

export type BuildRepository = {
  id: string;
  type: string;
  name: string;
  url: string;
  clean: null;
  checkoutSubmodules: boolean;
};

export type Build = {
  plans: { planId: string }[],
  id: number,
  buildNumber: string,
  status: BuildStatus,
  result: BuildResult,
  queueTime: Date,
  startTime: Date,
  finishTime: Date,
  url: string,
  definition: DefinitionReference,
  buildNumberRevision: number,
  project: TeamProjectReference,
  uri: string,
  sourceBranch: string,
  sourceVersion: string,
  queue: AgentPoolQueue,
  priority: QueuePriority,
  reason: BuildReason,
  requestedFor: IdentityRef
  requestedBy: IdentityRef,
  lastChangeDate: Date,
  lastChangedBy: IdentityRef,
  parameters: string,
  orchestrationPlan: { planId: string },
  repository: BuildRepository,
  keepForever: boolean,
  retainedByRelease: boolean,
  triggeredByBuild: Build | null
};

export type DeploymentAttempt = {
  id: number,
  deploymentId: number,
  attempt: number,
  reason: DeploymentReason,
  status: DeploymentStatus,
  operationStatus: DeploymentOperationStatus,
  // releaseDeploymentPhases: ReleaseDeployPhase[]
  requestedBy: IdentityRef,
  requestedFor: IdentityRef,
  queueOn: Date,
  lastModifiedBy: IdentityRef,
  lastModifiedOn: Date,
  hasStarted: boolean
};

export type ReleaseEnvironment = {
  id: number,
  releaseId: number,
  name: string,
  status: EnvironmentStatus,
  deploySteps: DeploymentAttempt[],
  rank: number,
  definitionEnvironmentId: number,
  // incomplete
};

export type ArtifactSourceReference = {
  id: string,
  name: string | null
}

export type Artifact = {
  sourceId: string,
  type: string,
  alias: string,
  definitionReference: {
    artifactSourceDefinitionUrl: ArtifactSourceReference,
    buildUri: ArtifactSourceReference,
    definition: ArtifactSourceReference,
    pullRequestSourceBranchCommitId: ArtifactSourceReference,
    pullRequestId: ArtifactSourceReference,
    pullRequestIterationId: ArtifactSourceReference,
    pullRequestMergeCommitId: ArtifactSourceReference,
    project: ArtifactSourceReference,
    pullRequestSourceBranch: ArtifactSourceReference,
    pullRequestTargetBranch: ArtifactSourceReference,
    repository: ArtifactSourceReference,
    requestedFor: ArtifactSourceReference,
    requestedForId: ArtifactSourceReference,
    branch: ArtifactSourceReference,
    [x: string]: ArtifactSourceReference
  }
};

export type ProjectReference = {
  id: string,
  name: string
};

export type ReleaseDefinitionShallowReference = {
  id: number,
  name: string,
  path: string,
  projectReference: ProjectReference | null,
  url: string
}

export type Release = {
  id: number,
  name: string,
  status: ReleaseStatus,
  createdOn: Date,
  modifiedOn: Date,
  modifiedBy: IdentityRef,
  createdBy: IdentityRef,
  environments: ReleaseEnvironment[],
  artifacts: Artifact[],
  releaseDefinition: ReleaseDefinitionShallowReference,
  releaseDefinitionRevision: number,
  description: string,
  reason: ReleaseReason,
  releaseNameFormat: string,
  keepForever: boolean,
  definitionSnapshotRevision: number,
  logsContainerUrl: string,
  url: string,
  projectReference: { id: string, name: string }
};

export type GitCommitRef = {
  commitId: string,
  url: string
};

export type GitPullRequestCompletionOptions = {
  mergeCommitMessage: string;
  mergeStrategy: GitPullRequestMergeStrategy;
  bypassReason: string;
  triggeredByAutoComplete: boolean;
};

export type GitPullRequest = {
  repository: {
    id: string,
    name: string,
    url: string,
    project: TeamProjectReference
  },
  pullRequestId: number,
  codeReviewId: number,
  status: PullRequestStatus,
  createdBy: IdentityRef,
  creationDate: Date,
  closedDate: Date,
  title: string,
  description: string,
  sourceRefName: string,
  targetRefName: string,
  mergeStatus: PullRequestAsyncStatus,
  isDraft: boolean,
  mergeId: string,
  lastMergeSourceCommit: GitCommitRef,
  lastMergeTargetCommit: GitCommitRef,
  lastMergeCommit: GitCommitRef,
  reviewers: (IdentityRef & { vote: number })[],
  url: string,
  completionOptions: GitPullRequestCompletionOptions,
  supportsIterations: boolean,
  completionQueueTime: Date
};

