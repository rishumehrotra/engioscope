import type { PipelineStage } from 'mongoose';
import { model, Schema } from 'mongoose';
import { last, omit, prop } from 'rambda';
import { z } from 'zod';
import { exists, oneDayInMs, oneMonthInMs } from '../../shared/utils.js';
import { configForProject, getConfig } from '../config.js';
import type { ParsedProjectConfig } from '../scraper/parse-config.js';
import type {
  Artifact as AzureArtifact, ArtifactType, DeploymentOperationStatus, DeploymentReason,
  DeploymentStatus, EnvironmentStatus, ReleaseReason, ReleaseStatus,
  Release as AzureRelease, ReleaseEnvironment as AzureReleaseEnvironment
} from '../scraper/types-azure.js';
import { collectionAndProjectInputs } from './helpers.js';
import type { ReleaseCondition } from './release-definitions.js';
import { getMinimalReleaseDefinitions } from './release-definitions.js';

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
    }],
    rank: { type: Number, required: true },
    definitionEnvironmentId: { type: Number, required: true },
    conditions: [{
      conditionType: { type: String, required: true },
      name: { type: String, required: true },
      value: { type: String, required: true }
    }]
  }],
  artifacts: [{
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
      connectionName: { type: String }
    }
  }],
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
  url: { type: String, required: true }
});

releaseSchema.index({ collectionName: 1, project: 1, id: 1 });
releaseSchema.index({ collectionName: 1, project: 1, releaseDefinitionId: 1 });

const ReleaseModel = model<Release>('Release', releaseSchema);

const environmentFromAPI = (environment: AzureReleaseEnvironment): ReleaseEnvironment => {
  const { deploySteps, ...rest } = environment;
  return {
    ...rest,
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
    })
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
    // eslint-disable-next-line no-nested-ternary
    buildDefinitionId: artifact.definitionReference.definition?.id
      ? (
        Number.isNaN(Number(artifact.definitionReference.definition.id))
          ? undefined
          : Number(artifact.definitionReference.definition.id)
      )
      : undefined,
    branch: artifact.definitionReference.branch?.id || undefined,
    pullRequestId: artifact.definitionReference.pullRequestId?.id || undefined,
    pullRequestSourceBranch: artifact.definitionReference.pullRequestSourceBranch?.id || undefined,
    pullRequestSourceBranchCommitId: artifact.definitionReference.pullRequestSourceBranchCommitId?.id || undefined,
    pullRequestMergeCommitId: artifact.definitionReference.pullRequestMergeCommitId?.id || undefined,
    pullRequestTargetBranch: artifact.definitionReference.pullRequestTargetBranch?.id || undefined,
    requestedForId: artifact.definitionReference.requestedForId?.id || undefined,
    repositoryId: artifact.definitionReference.repository?.id || undefined,
    repositoryName: artifact.definitionReference.repository?.name || undefined,
    connectionName: artifact.definitionReference.connection?.name || undefined,
    connectionId: artifact.definitionReference.connection?.id || undefined
  }
});

export const bulkSaveReleases = (collectionName: string) => (releases: AzureRelease[]) => (
  ReleaseModel.bulkWrite(releases.map(release => {
    const {
      projectReference, environments, artifacts, releaseDefinition, ...rest
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
            releaseDefinitionId: releaseDefinition.id,
            releaseDefinitionName: releaseDefinition.name,
            releaseDefinitionUrl: releaseDefinition.url,
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
    .aggregate<{ date: Date; id: number }>([
      { $match: { collectionName, project, modifiedOn: { $gt: new Date(oneDayInMs * 30 * 6) } } },
      {
        $project: {
          date: {
            $max: [
              '$environments.deploySteps.lastModifiedOn',
              '$modifiedOn',
              '$createdOn'
            ]
          },
          id: '$id'
        }
      }
    ])
);

export const getReleases = (
  collectionName: string, project: string,
  queryFrom = getConfig().azure.queryFrom
) => (
  ReleaseModel
    .aggregate<Release>([
      { $match: { collectionName, project, modifiedOn: { $gt: new Date(queryFrom.getTime() - oneMonthInMs) } } },
      {
        $addFields: {
          computedLastUpdate: {
            $max: [
              '$environments.deploySteps.lastModifiedOn',
              '$modifiedOn',
              '$createdOn'
            ]
          }
        }
      },
      { $match: { computedLastUpdate: { $gt: queryFrom } } }
    ])
);

export const pipelineFiltersInput = {
  ...collectionAndProjectInputs,
  searchTerm: z.string().optional(),
  nonMasterReleases: z.boolean().optional(),
  notStartingWithBuildArtifact: z.boolean().optional(),
  stageNameContaining: z.string().optional(),
  stageNameUsed: z.string().optional(),
  notConfirmingToBranchPolicies: z.boolean().optional(),
  repoGroups: z.array(z.string()).optional()
};

export const pipelineFiltersInputParser = z.object(pipelineFiltersInput);

const filterNotStartingWithBuildArtifact = (notStartingWithBuildArtifact?: boolean) => {
  if (!notStartingWithBuildArtifact) return {};
  return { 'artifacts.0': { $exists: false } };
};

const filterRepos = (collectionName: string, project: string, repoGroups: string[] | undefined) => {
  if (!repoGroups) return {};
  if (Object.keys(repoGroups).length === 0) return {};

  const repos = Object.entries(
    configForProject(collectionName, project)?.groupRepos?.groups || {}
  )
    .filter(([key]) => repoGroups.includes(key))
    .flatMap(([, repos]) => repos);

  return { 'artifacts.definition.repositoryName': { $in: repos } };
};

const addFilteredEnvsField = (ignoreStagesBefore: string | undefined): PipelineStage[] => (
  ignoreStagesBefore ? [
    {
      $addFields: {
        considerStagesAfter: {
          $indexOfArray: [
            {
              $map: {
                input: '$environments',
                as: 'env',
                in: { $regexMatch: { input: '$$env.name', regex: ignoreStagesBefore, options: 'i' } }
              }
            },
            true
          ]
        }
      }
    },
    {
      $addFields: {
        filteredEnvs: {
          $cond: {
            if: {
              $or: [{ $eq: ['$considerStagesAfter', -1] }, { $eq: ['$considerStagesAfter', null] }]
            },
            // eslint-disable-next-line unicorn/no-thenable
            then: '$environments',
            else: {
              $slice: [
                '$environments',
                '$considerStagesAfter',
                { $subtract: [{ $size: '$environments' }, '$considerStagesAfter'] }
              ]
            }
          }
        }
      }
    }
  ]
    : [
      { $addFields: { filteredEnvs: '$environments' } }
    ]
);

const filterNonMasterReleases = (nonMasterReleases: boolean | undefined): PipelineStage[] => {
  if (!nonMasterReleases) return [];

  return [
    {
      $match: {
        artifacts: { $elemMatch: { 'definition.branch': { $ne: 'refs/heads/master' } } }
      }
    },
    { $match: { 'filteredEnvs': { $elemMatch: { status: { $ne: 'notStarted' } } } } }
  ];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const filterByNotConfirmingToBranchPolicy = (
  notConfirmingToBranchPolicies: boolean | undefined,
  configuredBranchPolicies: ParsedProjectConfig['branchPolicies']
): PipelineStage[] => {
  if (!notConfirmingToBranchPolicies) return [];
  if (Object.keys(configuredBranchPolicies).length === 0) return [];

  const isPassingBranchPolicies = Object.entries(configuredBranchPolicies).flatMap(([key, value]) => ([
    'isEnabled' in value
      ? { [`policies.${key}.isEnabled`]: { $ne: !value.isEnabled } }
      : undefined,
    'isBlocking' in value
      ? { [`policies.${key}.isBlocking`]: { $ne: !value.isBlocking } }
      : undefined,
    'minimumApproverCount' in value
      ? { [`policies.${key}.minimumApproverCount`]: { $ne: !value.minimumApproverCount } }
      : undefined
  ]))
    .filter(exists)
    .reduce((acc, item) => ({ ...acc, ...item }), {});

  return [
    {
      $lookup: {
        from: 'repopolicies',
        as: 'policies',
        let: {
          collectionName: '$collectionName',
          project: '$project',
          repositoryId: '$artifacts.definition.repositoryId',
          branches: '$artifacts.definition.branch'
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$collectionName', '$$collectionName'] },
                  { $eq: ['$project', '$$project'] },
                  { $in: ['$repositoryId', '$$repositoryId'] },
                  { $in: ['$refName', '$$branches'] },
                  { $ne: ['$isDeleted', true] }
                ]
              }
            }
          },
          {
            $group: {
              _id: {
                repositoryId: '$repositoryId',
                branch: '$refName'
              },
              policies: {
                $push: {
                  k: '$type',
                  v: {
                    isBlocking: '$isBlocking',
                    isEnabled: '$isEnabled',
                    minimumApproverCount: '$settings.minimumApproverCount'
                  }
                }
              }
            }
          },
          { $project: { policies: { $arrayToObject: '$policies' } } },
          { $match: isPassingBranchPolicies }
        ]
      }
    }
    // { $match: {} }
  ];
};

const doesStageExist = (stage: string) => ({
  $anyElementTrue: {
    $map: {
      input: '$environments',
      as: 'env',
      in: { $regexMatch: { input: '$$env.name', regex: new RegExp(stage.toLowerCase(), 'gi') } }
    }
  }
});

const isStageUsed = (stage: string) => ({
  $anyElementTrue: {
    $map: {
      input: '$environments',
      as: 'env',
      in: {
        $and: [
          { $regexMatch: { input: '$$env.name', regex: new RegExp(stage.toLowerCase(), 'gi') } },
          { $ne: ['$$env.status', 'notStarted'] }
        ]
      }
    }
  }
});

const isStageSuccessful = (stage: string) => ({
  $anyElementTrue: {
    $map: {
      input: '$environments',
      as: 'env',
      in: {
        $and: [
          { $regexMatch: { input: '$$env.name', regex: new RegExp(stage.toLowerCase(), 'gi') } },
          { $eq: ['$$env.status', 'succeeded'] }
        ]
      }
    }
  }
});

const filterStageNameUsed = (stageNameUsed: string | undefined): PipelineStage[] => (
  stageNameUsed ? [
    { $addFields: { isStageUsed: isStageUsed(stageNameUsed) } },
    { $match: { isStageUsed: true } }
  ] : []
);

/**
 * Note: This function doesn't account for options.notConfirmingToBranchPolicies!!!
 * That parameter needs an entirely different approach, so is not implemented here.
 */
const createFilter = async (options: z.infer<typeof pipelineFiltersInputParser>): Promise<PipelineStage[]> => {
  const {
    collectionName, project, nonMasterReleases,
    /* notConfirmingToBranchPolicies, */
    searchTerm, notStartingWithBuildArtifact, stageNameContaining,
    stageNameUsed, repoGroups
  } = options;

  const releaseDefns = await getMinimalReleaseDefinitions(
    collectionName, project, searchTerm, stageNameContaining
  );

  const projectConfig = configForProject(collectionName, project);
  const ignoreStagesBefore = projectConfig?.releasePipelines.ignoreStagesBefore;

  return [
    {
      $match: {
        collectionName,
        project,
        modifiedOn: { $gte: getConfig().azure.queryFrom },
        releaseDefinitionId: { $in: releaseDefns.map(prop('id')) },
        ...filterNotStartingWithBuildArtifact(notStartingWithBuildArtifact),
        ...filterRepos(collectionName, project, repoGroups)
      }
    },
    ...addFilteredEnvsField(ignoreStagesBefore),
    ...filterNonMasterReleases(nonMasterReleases),
    ...filterStageNameUsed(stageNameUsed)
  ];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const forAllArtifacts = (inClause: any) => ({
  $and: [
    { $ne: [{ $size: '$artifacts' }, 0] },
    {
      $allElementsTrue: {
        $map: {
          input: '$artifacts',
          as: 'artifact',
          in: inClause
        }
      }
    }
  ]
});

const addStagesToHighlight = (collectionName: string, project: string) => {
  const stagesToHighlight = configForProject(collectionName, project)?.releasePipelines.stagesToHighlight;
  if (!stagesToHighlight) return {};
  return stagesToHighlight.reduce((acc, stage) => ({
    ...acc,
    [`${stage}:exists`]: doesStageExist(stage),
    [`${stage}:used`]: isStageUsed(stage)
  }), {});
};

const incIfTrue = (condition: unknown) => ({ $sum: { $cond: [condition, 1, 0] } });
const incIfNonZero = (field: string) => ({ $sum: { $cond: [{ $gt: [field, 0] }, 1, 0] } });

const createSummary = (collectionName: string, project: string): PipelineStage[] => {
  const projectConfig = configForProject(collectionName, project);

  return [
    {
      $group: {
        _id: '$releaseDefinitionId',
        runCount: { $count: {} },
        lastEnvDeploys: incIfTrue('$deployedToLastEnvironment'),
        lastEnvSuccesfulDeploys: incIfTrue({
          $and: [
            '$deployedToLastEnvironment', '$successfulDeployToLastEnvironment'
          ]
        }),
        startsWithArtifact: incIfTrue('$startsWithArtifact'),
        ...(projectConfig?.releasePipelines.stagesToHighlight.reduce((acc, item) => ({
          ...acc,
          [`${item}:exists`]: { $sum: incIfTrue(`$${item}:exists`) },
          [`${item}:used`]: { $sum: incIfTrue(`$${item}:used`) }
        }), {})),
        masterOnly: incIfTrue('$masterOnly')
      }
    },
    {
      $group: {
        _id: null,
        runCount: { $sum: '$runCount' },
        pipelineCount: { $count: {} },
        lastEnvDeploys: { $sum: '$lastEnvDeploys' },
        lastEnvSuccesfulDeploys: { $sum: '$lastEnvSuccesfulDeploys' },
        startsWithArtifact: incIfNonZero('$startsWithArtifact'),
        ...(projectConfig?.releasePipelines.stagesToHighlight.reduce((acc, item) => ({
          ...acc,
          [`${item}:exists`]: incIfNonZero(`$${item}:exists`),
          [`${item}:used`]: incIfNonZero(`$${item}:used`)
        }), {})),
        masterOnly: { $sum: '$masterOnly' }
      }
    },
    {
      $project: {
        runCount: '$runCount',
        pipelineCount: '$pipelineCount',
        lastEnv: projectConfig?.environments ? {
          envName: last(projectConfig.environments),
          deploys: '$lastEnvDeploys',
          successful: '$lastEnvSuccesfulDeploys'
        } : undefined,
        startsWithArtifact: '$startsWithArtifact',
        masterOnly: '$masterOnly',
        stagesToHighlight: projectConfig?.releasePipelines.stagesToHighlight.map(stage => ({
          name: stage,
          exists: `$${stage}:exists`,
          used: `$${stage}:used`
        })),
        ignoredStagesBefore: projectConfig?.releasePipelines.ignoreStagesBefore
      }
    }
  ];
};

const addBooleanFields = (collectionName: string, project: string): PipelineStage => {
  const projectConfig = configForProject(collectionName, project);
  const lastEnvironmentName = projectConfig?.environments ? last(projectConfig.environments) : undefined;
  const lastEnvironmentFields = lastEnvironmentName ? {
    deployedToLastEnvironment: isStageUsed(lastEnvironmentName),
    successfulDeployToLastEnvironment: isStageSuccessful(lastEnvironmentName)
  } : {};

  return {
    $addFields: {
      startsWithArtifact: forAllArtifacts(
        { $in: ['$$artifact.type', ['Build', 'Artifactory']] }
      ),
      masterOnly: forAllArtifacts({
        $and: [
          { $eq: ['$$artifact.type', 'Build'] },
          {
            $or: [
              { $eq: ['$$artifact.definition.branch', 'refs/heads/master'] },
              { $eq: ['$$artifact.definition.branch', 'refs/heads/main'] }
            ]
          }
        ]
      }),
      ...addStagesToHighlight(collectionName, project),
      ...lastEnvironmentFields
    }
  };
};

type Summary = {
  runCount: number;
  pipelineCount: number;
  lastEnv: {
    envName: string;
    deploys: number;
    successful: number;
  };
  startsWithArtifact: number;
  masterOnly: number;
  stagesToHighlight: {
    name: string;
    exists: number;
    used: number;
  }[];
  ignoredStagesBefore?: string;
};

export const summary = async (options: z.infer<typeof pipelineFiltersInputParser>) => {
  const filter = await createFilter(options);

  const summary = await ReleaseModel
    .aggregate<Summary & {_id: null}>([
      ...filter,
      addBooleanFields(options.collectionName, options.project),
      ...createSummary(options.collectionName, options.project)
    ]);

  return omit(['_id'], summary[0]);
};

export const paginatedReleaseIdsInputParser = z.object({
  ...pipelineFiltersInput,
  cursor: z.object({
    pageSize: z.number().optional(),
    pageNumber: z.number().optional()
  }).nullish()
});

export const paginatedReleaseIds = async (options: z.infer<typeof paginatedReleaseIdsInputParser>) => {
  const filter = await createFilter(options);

  const page = await ReleaseModel
    .aggregate<{_id: number; url: string; name: string}>([
      ...filter,
      {
        $group: {
          _id: '$releaseDefinitionId',
          releaseDefinitionUrl: { $first: '$releaseDefinitionUrl' },
          releaseDefinitionName: { $first: '$releaseDefinitionName' },
          lastModifiedOn: { $max: '$modifiedOn' }
        }
      },
      { $sort: { lastModifiedOn: -1, _id: -1 } },
      { $skip: (options.cursor?.pageNumber || 0) * (options.cursor?.pageSize || 5) },
      { $limit: options.cursor?.pageSize || 5 },
      {
        $project: {
          url: '$releaseDefinitionUrl',
          name: '$releaseDefinitionName'
        }
      }
    ]);

  return {
    items: page.map(pipeline => ({
      id: pipeline._id,
      url: pipeline.url.replace('/_apis/Release/definitions/', '/_release?definitionId='),
      name: pipeline.name
    })),
    nextCursor: {
      pageNumber: (options.cursor?.pageNumber || 0) + 1,
      pageSize: options.cursor?.pageSize || 5
    }
  };
};
