import type { PipelineStage } from 'mongoose';
import { last, omit, prop } from 'rambda';
import { z } from 'zod';
import { exists } from '../../shared/utils.js';
import { configForProject, getConfig } from '../config.js';
import type { ParsedProjectConfig } from '../scraper/parse-config.js';
import { collectionAndProjectInputs } from './helpers.js';
import { getMinimalReleaseDefinitions, ReleaseDefinitionModel } from './release-definitions.js';
import { ReleaseModel } from './releases.js';

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
  if (!notStartingWithBuildArtifact) { return {}; }
  return { 'artifacts.0': { $exists: false } };
};
const filterRepos = (collectionName: string, project: string, repoGroups: string[] | undefined) => {
  if (!repoGroups) { return {}; }
  if (Object.keys(repoGroups).length === 0) { return {}; }

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
  if (!nonMasterReleases) { return []; }

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
  if (!notConfirmingToBranchPolicies) { return []; }
  if (Object.keys(configuredBranchPolicies).length === 0) { return []; }

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
    searchTerm, notStartingWithBuildArtifact, stageNameContaining, stageNameUsed, repoGroups
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
  if (!stagesToHighlight) { return {}; }
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
    .aggregate<Summary & { _id: null }>([
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
    .aggregate<{ _id: number; url: string; name: string }>([
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

export const releasePipelineDetailsInputParser = z.object({
  ...collectionAndProjectInputs,
  releaseDefnId: z.number(),
  queryFrom: z.date().optional()
});

export const releasePipelineDetails = async ({
  collectionName, project, releaseDefnId, queryFrom
}: z.infer<typeof releasePipelineDetailsInputParser>) => {
  const projectConfig = configForProject(collectionName, project);
  const ignoreStagesBefore = projectConfig?.releasePipelines.ignoreStagesBefore;
  const [releaseDefn, environments, artifacts] = await Promise.all([
    ReleaseDefinitionModel
      .find({ collectionName, project, id: releaseDefnId }),
    ReleaseModel
      .aggregate<{ _id: string; runs: number; successes: number }>([
        {
          $match: {
            collectionName,
            project,
            releaseDefinitionId: releaseDefnId,
            modifiedOn: { $gt: queryFrom }
          }
        },
        {
          $unwind: { path: '$environments' }
        },
        {
          $group: {
            _id: '$environments.name',
            runs: {
              $sum: {
                $cond: {
                  if: { $ne: ['$environments.status', 'notStarted'] },
                  // eslint-disable-next-line unicorn/no-thenable
                  then: 1,
                  else: 0
                }
              }
            },
            successes: {
              $sum: {
                $cond: {
                  if: { $eq: ['$environments.status', 'succeeded'] },
                  // eslint-disable-next-line unicorn/no-thenable
                  then: 1,
                  else: 0
                }
              }
            }
          }
        }
      ]),
    ReleaseModel.aggregate< {
      _id: {
        alias: string;
      } &({
        type: 'Build';
        repostitoryName: string;
        branch: string;
      } | {
        type: 'Artifactory';
      });
      buildPipelineUrl: string;
      isPrimary: true | null;
      hasGoneAhead: boolean;
    }>([
          {
            $match: {
              collectionName,
              project,
              releaseDefinitionId: releaseDefnId,
              modifiedOn: { $gt: queryFrom }
            }
          },
          ...(ignoreStagesBefore ? ([
            ...addFilteredEnvsField(ignoreStagesBefore),
            {
              $addFields: {
                hasGoneAhead: {
                  $anyElementTrue: {
                    $map: {
                      input: '$filteredEnvs',
                      as: 'env',
                      in: { $ne: ['$$env.status', 'notStarted'] }
                    }
                  }
                }
              }
            },
            { $unset: 'filteredEnvs' }
          ]) : []),
          { $unwind: '$artifacts' },
          {
            $group: {
              _id: {
                type: '$artifacts.type',
                alias: '$artifacts.alias',
                repostitoryName: '$artifacts.definition.repositoryName',
                branch: '$artifacts.definition.branch'
              },
              buildPipelineUrl: { $first: '$artifacts.definition.buildPipelineUrl' },
              isPrimary: { $first: '$artifacts.isPrimary' },
              hasGoneAhead: { $push: '$hasGoneAhead' }
            }
          },
          {
            $addFields: {
              hasGoneAhead: { $anyElementTrue: '$hasGoneAhead' }
            }
          }
        ]).then(results => results.map(({
          _id, hasGoneAhead, isPrimary, buildPipelineUrl
        }) => ({
          ..._id,
          buildPipelineUrl,
          isPrimary: isPrimary || undefined,
          hasGoneAhead
        })))
  ]);

  return [releaseDefn, environments, artifacts] as const;
};

export const getArtifacts = async ({
  collectionName, project, releaseDefnId, queryFrom
}: z.infer<typeof releasePipelineDetailsInputParser>) => {
  const projectConfig = configForProject(collectionName, project);
  const ignoreStagesBefore = projectConfig?.releasePipelines.ignoreStagesBefore;

  type AggregateArtifact = {
    _id: {
      alias: string;
    } & ({
      type: 'Build';
      repostitoryName: string;
      branch: string;
    } | {
      type: 'Artifactory';
    });
    buildPipelineUrl: string;
    isPrimary: true | null;
    hasGoneAhead: boolean;
  };

  const results = await ReleaseModel.aggregate<AggregateArtifact>([
    {
      $match: {
        collectionName,
        project,
        releaseDefinitionId: releaseDefnId,
        modifiedOn: { $gt: queryFrom || getConfig().azure.queryFrom }
      }
    },
    ...(ignoreStagesBefore ? ([
      ...addFilteredEnvsField(ignoreStagesBefore),
      {
        $addFields: {
          hasGoneAhead: {
            $anyElementTrue: {
              $map: {
                input: '$filteredEnvs',
                as: 'env',
                in: { $ne: ['$$env.status', 'notStarted'] }
              }
            }
          }
        }
      },
      { $unset: 'filteredEnvs' }
    ]) : []),
    { $unwind: '$artifacts' },
    {
      $group: {
        _id: {
          type: '$artifacts.type',
          alias: '$artifacts.alias',
          repostitoryName: '$artifacts.definition.repositoryName',
          branch: '$artifacts.definition.branch'
        },
        buildPipelineUrl: { $first: '$artifacts.definition.buildPipelineUrl' },
        isPrimary: { $first: '$artifacts.isPrimary' },
        hasGoneAhead: { $push: '$hasGoneAhead' }
      }
    },
    {
      $addFields: {
        hasGoneAhead: { $anyElementTrue: '$hasGoneAhead' }
      }
    }
  ]);

  const { builds, others } = results.reduce<{
    builds: Record<string, {
      type: 'Build';
      name: string;
      isPrimary?: boolean;
      branches: {
        name: string;
      }[];
      additionalBranches: {
        name: string;
      }[];
    }>;
    others: {
      type: 'Other';
      source: string;
      alias: string;
      isPrimary?: boolean;
    }[];
  }>((acc, result) => {
    if (result._id.type === 'Build') {
      acc.builds[result.buildPipelineUrl] = acc.builds[result.buildPipelineUrl] || {
        type: 'Build',
        name: result._id.repostitoryName,
        isPrimary: result.isPrimary || undefined,
        branches: [],
        additionalBranches: []
      };

      (result.hasGoneAhead
        ? acc.builds[result.buildPipelineUrl].branches
        : acc.builds[result.buildPipelineUrl].additionalBranches
      ).push({ name: result._id.branch });
    } else {
      acc.others.push({
        type: 'Other',
        source: result._id.type,
        alias: result._id.alias,
        isPrimary: result.isPrimary || undefined
      });
    }

    return acc;
  }, { builds: {}, others: [] });

  return [...others, ...Object.values(builds)];
};
