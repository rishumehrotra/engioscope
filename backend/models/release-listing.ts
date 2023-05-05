import type { PipelineStage } from 'mongoose';
import { last, omit, prop, sum } from 'rambda';
import { z } from 'zod';
import { exists } from '../../shared/utils.js';
import { configForProject } from '../config.js';
import type { ArtifactType } from '../scraper/types-azure.js';
import { inDateRange } from './helpers.js';
import { conformsToBranchPolicies } from './policy-configuration.js';
import {
  getMinimalReleaseDefinitions,
  ReleaseDefinitionModel,
} from './release-definitions.js';
import { ReleaseModel } from './mongoose-models/ReleaseEnvironment.js';
import type { QueryContext } from './utils.js';
import { fromContext, queryContextInputParser } from './utils.js';

export const pipelineFiltersInput = {
  queryContext: queryContextInputParser,
  searchTerm: z.string().optional(),
  nonMasterReleases: z.boolean().optional(),
  notStartingWithBuildArtifact: z.boolean().optional(),
  stageNameContaining: z.string().optional(),
  stageNameUsed: z.string().optional(),
  notConfirmingToBranchPolicies: z.boolean().optional(),
  repoGroups: z.array(z.string()).optional(),
};

export const pipelineFiltersInputParser = z.object(pipelineFiltersInput);
const filterNotStartingWithBuildArtifact = (notStartingWithBuildArtifact?: boolean) => {
  if (!notStartingWithBuildArtifact) {
    return {};
  }
  return { 'artifacts.0': { $exists: false } };
};

const filterRepos = (
  collectionName: string,
  project: string,
  repoGroups: string[] | undefined
) => {
  if (!repoGroups) {
    return {};
  }
  if (Object.keys(repoGroups).length === 0) {
    return {};
  }

  const repos = Object.entries(
    configForProject(collectionName, project)?.groupRepos?.groups || {}
  )
    .filter(([key]) => repoGroups.includes(key))
    .flatMap(([, repos]) => repos);

  return { 'artifacts.definition.repositoryName': { $in: repos } };
};

const addExactRepoSearch = (searchTerm?: string) => {
  if (!searchTerm) return [];

  const repoSearch = searchTerm.match(/^repo:"(.*)"$/);
  if (!repoSearch) return [];

  const repoName = repoSearch[1];
  return [{ $match: { 'artifacts.definition.repositoryName': repoName } }];
};

const addFilteredEnvsField = (ignoreStagesBefore: string | undefined): PipelineStage[] =>
  ignoreStagesBefore
    ? [
        {
          $addFields: {
            considerStagesAfter: {
              $indexOfArray: [
                {
                  $map: {
                    input: '$environments',
                    as: 'env',
                    in: {
                      $regexMatch: {
                        input: '$$env.name',
                        regex: ignoreStagesBefore,
                        options: 'i',
                      },
                    },
                  },
                },
                true,
              ],
            },
          },
        },
        {
          $addFields: {
            filteredEnvs: {
              $cond: {
                if: {
                  $or: [
                    { $eq: ['$considerStagesAfter', -1] },
                    { $eq: ['$considerStagesAfter', null] },
                  ],
                },
                then: '$environments',
                else: {
                  $slice: [
                    '$environments',
                    '$considerStagesAfter',
                    { $subtract: [{ $size: '$environments' }, '$considerStagesAfter'] },
                  ],
                },
              },
            },
          },
        },
      ]
    : [{ $addFields: { filteredEnvs: '$environments' } }];

const filterNonMasterReleases = (
  nonMasterReleases: boolean | undefined
): PipelineStage[] => {
  if (!nonMasterReleases) {
    return [];
  }

  return [
    {
      $match: {
        artifacts: { $elemMatch: { 'definition.branch': { $ne: 'refs/heads/master' } } },
      },
    },
    { $match: { filteredEnvs: { $elemMatch: { status: { $ne: 'notStarted' } } } } },
  ];
};

const doesStageExist = (stage: string) => ({
  $anyElementTrue: {
    $map: {
      input: '$environments',
      as: 'env',
      in: {
        $regexMatch: {
          input: '$$env.name',
          regex: new RegExp(stage.toLowerCase(), 'gi'),
        },
      },
    },
  },
});

const isStageUsed = (stage: string) => ({
  $anyElementTrue: {
    $map: {
      input: '$environments',
      as: 'env',
      in: {
        $and: [
          {
            $regexMatch: {
              input: '$$env.name',
              regex: new RegExp(stage.toLowerCase(), 'gi'),
            },
          },
          { $ne: ['$$env.status', 'notStarted'] },
        ],
      },
    },
  },
});

const isStageSuccessful = (stage: string) => ({
  $anyElementTrue: {
    $map: {
      input: '$environments',
      as: 'env',
      in: {
        $and: [
          {
            $regexMatch: {
              input: '$$env.name',
              regex: new RegExp(stage.toLowerCase(), 'gi'),
            },
          },
          { $eq: ['$$env.status', 'succeeded'] },
        ],
      },
    },
  },
});

const filterStageNameUsed = (stageNameUsed: string | undefined): PipelineStage[] =>
  stageNameUsed
    ? [
        { $addFields: { isStageUsed: isStageUsed(stageNameUsed) } },
        { $match: { isStageUsed: true } },
      ]
    : [];
/**
 * Note: This function doesn't account for options.notConfirmingToBranchPolicies!!!
 * That parameter needs an entirely different approach, so is not implemented here.
 */
const createFilter = async (
  options: z.infer<typeof pipelineFiltersInputParser>
): Promise<PipelineStage[]> => {
  const {
    queryContext,
    nonMasterReleases,
    /* notConfirmingToBranchPolicies, */
    searchTerm,
    notStartingWithBuildArtifact,
    stageNameContaining,
    stageNameUsed,
    repoGroups,
  } = options;

  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const releaseDefns = await getMinimalReleaseDefinitions(
    collectionName,
    project,
    searchTerm,
    stageNameContaining
  );

  const projectConfig = configForProject(collectionName, project);
  const ignoreStagesBefore = projectConfig?.releasePipelines.ignoreStagesBefore;

  return [
    {
      $match: {
        collectionName,
        project,
        modifiedOn: inDateRange(startDate, endDate),
        releaseDefinitionId: { $in: releaseDefns.map(prop('id')) },
        ...filterNotStartingWithBuildArtifact(notStartingWithBuildArtifact),
        ...filterRepos(collectionName, project, repoGroups),
      },
    },
    ...addExactRepoSearch(searchTerm),
    ...addFilteredEnvsField(ignoreStagesBefore),
    ...filterNonMasterReleases(nonMasterReleases),
    ...filterStageNameUsed(stageNameUsed),
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
          in: inClause,
        },
      },
    },
  ],
});

const addStagesToHighlight = (collectionName: string, project: string) => {
  const stagesToHighlight = configForProject(collectionName, project)?.releasePipelines
    .stagesToHighlight;
  if (!stagesToHighlight) {
    return {};
  }
  return stagesToHighlight.reduce(
    (acc, stage) => ({
      ...acc,
      [`${stage}:exists`]: doesStageExist(stage),
      [`${stage}:used`]: isStageUsed(stage),
    }),
    {}
  );
};

const incIfTrue = (condition: unknown) => ({ $sum: { $cond: [condition, 1, 0] } });
const incIfNonZero = (field: string) => ({
  $sum: { $cond: [{ $gt: [field, 0] }, 1, 0] },
});

const createSummary = (collectionName: string, project: string): PipelineStage[] => {
  const projectConfig = configForProject(collectionName, project);

  return [
    {
      $group: {
        _id: '$releaseDefinitionId',
        runCount: { $count: {} },
        lastEnvDeploys: incIfTrue('$deployedToLastEnvironment'),
        lastEnvSuccesfulDeploys: incIfTrue({
          $and: ['$deployedToLastEnvironment', '$successfulDeployToLastEnvironment'],
        }),
        startsWithArtifact: incIfTrue('$startsWithArtifact'),
        ...projectConfig?.releasePipelines.stagesToHighlight.reduce(
          (acc, item) => ({
            ...acc,
            [`${item}:exists`]: { $sum: incIfTrue(`$${item}:exists`) },
            [`${item}:used`]: { $sum: incIfTrue(`$${item}:used`) },
          }),
          {}
        ),
        masterOnly: incIfTrue('$masterOnly'),
      },
    },
    {
      $group: {
        _id: null,
        runCount: { $sum: '$runCount' },
        pipelineCount: { $count: {} },
        lastEnvDeploys: { $sum: '$lastEnvDeploys' },
        lastEnvSuccesfulDeploys: { $sum: '$lastEnvSuccesfulDeploys' },
        startsWithArtifact: incIfNonZero('$startsWithArtifact'),
        ...projectConfig?.releasePipelines.stagesToHighlight.reduce(
          (acc, item) => ({
            ...acc,
            [`${item}:exists`]: incIfNonZero(`$${item}:exists`),
            [`${item}:used`]: incIfNonZero(`$${item}:used`),
          }),
          {}
        ),
        masterOnly: { $sum: '$masterOnly' },
      },
    },
    {
      $project: {
        runCount: '$runCount',
        pipelineCount: '$pipelineCount',
        lastEnv: projectConfig?.environments
          ? {
              envName: last(projectConfig.environments),
              deploys: '$lastEnvDeploys',
              successful: '$lastEnvSuccesfulDeploys',
            }
          : undefined,
        startsWithArtifact: '$startsWithArtifact',
        masterOnly: '$masterOnly',
        stagesToHighlight: projectConfig?.releasePipelines.stagesToHighlight.map(
          stage => ({
            name: stage,
            exists: `$${stage}:exists`,
            used: `$${stage}:used`,
          })
        ),
        ignoredStagesBefore: projectConfig?.releasePipelines.ignoreStagesBefore,
      },
    },
  ];
};

const addBooleanFields = (collectionName: string, project: string): PipelineStage => {
  const projectConfig = configForProject(collectionName, project);
  const lastEnvironmentName = projectConfig?.environments
    ? last(projectConfig.environments)
    : undefined;
  const lastEnvironmentFields = lastEnvironmentName
    ? {
        deployedToLastEnvironment: isStageUsed(lastEnvironmentName),
        successfulDeployToLastEnvironment: isStageSuccessful(lastEnvironmentName),
      }
    : {};

  return {
    $addFields: {
      startsWithArtifact: forAllArtifacts({
        $in: ['$$artifact.type', ['Build', 'Artifactory']],
      }),
      masterOnly: forAllArtifacts({
        $and: [
          { $eq: ['$$artifact.type', 'Build'] },
          {
            $or: [
              { $eq: ['$$artifact.definition.branch', 'refs/heads/master'] },
              { $eq: ['$$artifact.definition.branch', 'refs/heads/main'] },
            ],
          },
        ],
      }),
      ...addStagesToHighlight(collectionName, project),
      ...lastEnvironmentFields,
    },
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

const conformsToBranchPoliciesSummary = async (
  options: z.infer<typeof pipelineFiltersInputParser>
) => {
  const filter = await createFilter(options);
  const { collectionName, project } = fromContext(options.queryContext);
  const projectConfig = configForProject(collectionName, project);
  const ignoreStagesBefore = projectConfig?.releasePipelines.ignoreStagesBefore;

  const result = await ReleaseModel.aggregate<{ _id: boolean; count: number }>([
    ...filter,
    ...addFilteredEnvsField(ignoreStagesBefore),
    {
      $addFields: {
        hasGoneAhead: {
          $anyElementTrue: {
            $map: {
              input: '$filteredEnvs',
              as: 'env',
              in: { $ne: ['$$env.status', 'notStarted'] },
            },
          },
        },
      },
    },
    { $match: { hasGoneAhead: true } },
    { $unwind: '$artifacts' },
    { $match: { 'artifacts.type': 'Build' } },
    {
      $project: {
        collectionName: '$collectionName',
        project: '$project',
        repositoryId: '$artifacts.definition.repositoryId',
        branch: '$artifacts.definition.branch',
      },
    },
    {
      $lookup: {
        from: 'combinedbranchpolicies',
        let: {
          collectionName: '$collectionName',
          project: '$project',
          repositoryId: '$repositoryId',
          branch: '$branch',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$collectionName', '$$collectionName'] },
                  { $eq: ['$project', '$$project'] },
                  { $eq: ['$repositoryId', '$$repositoryId'] },
                  { $eq: ['$refName', '$$branch'] },
                ],
              },
            },
          },
        ],
        as: 'conforms',
      },
    },
    { $project: { conforms: { $arrayElemAt: ['$conforms', 0] } } },
    { $project: { conforms: { $ifNull: ['$conforms.conforms', false] } } },
    { $group: { _id: '$conforms', count: { $sum: 1 } } },
  ]);

  return {
    conforms: result.find(x => x._id)?.count || 0,
    total: sum(result.map(x => x.count)),
  };
};

export const summary = async (options: z.infer<typeof pipelineFiltersInputParser>) => {
  const { collectionName, project } = fromContext(options.queryContext);
  const filter = await createFilter(options);

  const [[summary], branchPolicy] = await Promise.all([
    ReleaseModel.aggregate<Summary & { _id: null }>([
      ...filter,
      addBooleanFields(collectionName, project),
      ...createSummary(collectionName, project),
    ]),
    conformsToBranchPoliciesSummary(options),
  ]);

  return {
    ...omit(['_id'], summary),
    branchPolicy,
  };
};

export const paginatedReleaseIdsInputParser = z.object({
  ...pipelineFiltersInput,
  cursor: z
    .object({
      pageSize: z.number().optional(),
      pageNumber: z.number().optional(),
    })
    .nullish(),
});

export const filteredReleaseCount = async (
  options: z.infer<typeof paginatedReleaseIdsInputParser>
) => {
  const filter = await createFilter(options);

  const result = await ReleaseModel.aggregate<{ count: number }>([
    ...filter,
    {
      $group: {
        _id: '$releaseDefinitionId',
        releaseDefinitionUrl: { $first: '$releaseDefinitionUrl' },
        releaseDefinitionName: { $first: '$releaseDefinitionName' },
        lastModifiedOn: { $max: '$modifiedOn' },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0]?.count || 0;
};

export const paginatedReleaseIds = async (
  options: z.infer<typeof paginatedReleaseIdsInputParser>
) => {
  const filter = await createFilter(options);

  const page = await ReleaseModel.aggregate<{ _id: number; url: string; name: string }>([
    ...filter,
    {
      $group: {
        _id: '$releaseDefinitionId',
        releaseDefinitionUrl: { $first: '$releaseDefinitionUrl' },
        releaseDefinitionName: { $first: '$releaseDefinitionName' },
        lastModifiedOn: { $max: '$modifiedOn' },
      },
    },
    { $sort: { lastModifiedOn: -1, _id: -1 } },
    { $skip: (options.cursor?.pageNumber || 0) * (options.cursor?.pageSize || 5) },
    { $limit: options.cursor?.pageSize || 5 },
    {
      $project: {
        url: '$releaseDefinitionUrl',
        name: '$releaseDefinitionName',
      },
    },
  ]);

  return {
    items: page.map(pipeline => ({
      id: pipeline._id,
      url: pipeline.url.replace('/_apis/Release/definitions/', '/_release?definitionId='),
      name: pipeline.name,
    })),
    nextCursor: {
      pageNumber: (options.cursor?.pageNumber || 0) + 1,
      pageSize: options.cursor?.pageSize || 5,
    },
  };
};

export const releasePipelineDetailsInputParser = z.object({
  queryContext: queryContextInputParser,
  releaseDefnId: z.number(),
});

export const releasePipelineStages = async ({
  queryContext,
  releaseDefnId,
}: z.infer<typeof releasePipelineDetailsInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const [releaseDefn, environments] = await Promise.all([
    ReleaseDefinitionModel.findOne(
      { collectionName, project, id: releaseDefnId },
      { environments: 1 }
    ).lean(),
    ReleaseModel.aggregate<{ _id: string; runs: number; successes: number }>([
      {
        $match: {
          collectionName,
          project,
          releaseDefinitionId: releaseDefnId,
          modifiedOn: inDateRange(startDate, endDate),
        },
      },
      {
        $unwind: { path: '$environments' },
      },
      {
        $group: {
          _id: '$environments.name',
          runs: {
            $sum: {
              $cond: {
                if: { $ne: ['$environments.status', 'notStarted'] },
                then: 1,
                else: 0,
              },
            },
          },
          successes: {
            $sum: {
              $cond: {
                if: { $eq: ['$environments.status', 'succeeded'] },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
    ]),
  ]);

  return releaseDefn?.environments.map(env => {
    const matchingEnvStats = environments.find(e => e._id === env.name);

    return {
      name: env.name,
      conditions: env.conditions.map(c => ({ type: c.conditionType, name: c.name })),
      rank: env.rank,
      total: matchingEnvStats?.runs || 0,
      successful: matchingEnvStats?.successes || 0,
    };
  });
};

export const getArtifacts = async ({
  queryContext,
  releaseDefnId,
}: z.infer<typeof releasePipelineDetailsInputParser>) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const projectConfig = configForProject(collectionName, project);
  const ignoreStagesBefore = projectConfig?.releasePipelines.ignoreStagesBefore;

  type AggregateArtifact = {
    _id:
      | {
          type: 'Build';
          repositoryName: string;
          repositoryId: string;
          branch: string;
          alias: string;
        }
      | {
          type: Exclude<ArtifactType, 'Build'>;
          alias: string;
        };
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
        modifiedOn: inDateRange(startDate, endDate),
      },
    },
    ...(ignoreStagesBefore
      ? [
          ...addFilteredEnvsField(ignoreStagesBefore),
          {
            $addFields: {
              hasGoneAhead: {
                $anyElementTrue: {
                  $map: {
                    input: '$filteredEnvs',
                    as: 'env',
                    in: { $ne: ['$$env.status', 'notStarted'] },
                  },
                },
              },
            },
          },
          { $unset: 'filteredEnvs' },
        ]
      : []),
    { $unwind: '$artifacts' },
    {
      $group: {
        _id: {
          type: '$artifacts.type',
          alias: '$artifacts.alias',
          repositoryName: '$artifacts.definition.repositoryName',
          repositoryId: '$artifacts.definition.repositoryId',
          branch: '$artifacts.definition.branch',
        },
        buildPipelineUrl: { $first: '$artifacts.definition.buildPipelineUrl' },
        isPrimary: { $first: '$artifacts.isPrimary' },
        hasGoneAhead: { $push: '$hasGoneAhead' },
      },
    },
    {
      $addFields: {
        hasGoneAhead: { $anyElementTrue: '$hasGoneAhead' },
      },
    },
  ]);

  const conformsStatus = await Promise.all(
    results
      .map(r => {
        if (r._id.type !== 'Build') return;
        return { repositoryId: r._id.repositoryId, refName: r._id.branch };
      })
      .filter(exists)
      .map(async r => {
        return {
          ...r,
          conforms: await conformsToBranchPolicies({ collectionName, project, ...r }),
        };
      })
  );

  const { builds, others } = results.reduce<{
    builds: Record<
      string,
      {
        type: 'Build';
        name: string;
        isPrimary?: boolean;
        repoId: string;
        branches: {
          name: string;
          conforms: boolean | undefined;
        }[];
        additionalBranches: {
          name: string;
          conforms: boolean | undefined;
        }[];
      }
    >;
    others: {
      type: Exclude<ArtifactType, 'Build'>;
      source: string;
      alias: string;
      isPrimary?: boolean;
    }[];
  }>(
    (acc, result) => {
      if (result._id.type === 'Build') {
        acc.builds[result.buildPipelineUrl] = acc.builds[result.buildPipelineUrl] || {
          type: 'Build',
          name: result._id.repositoryName,
          repoId: result._id.repositoryId,
          isPrimary: result.isPrimary || undefined,
          branches: [],
          additionalBranches: [],
        };

        const branchesList = result.hasGoneAhead
          ? acc.builds[result.buildPipelineUrl].branches
          : acc.builds[result.buildPipelineUrl].additionalBranches;

        if (
          !branchesList.some(
            b => result._id.type === 'Build' && b.name === result._id.branch
          )
        ) {
          branchesList.push({
            name: result._id.branch,
            conforms: conformsStatus.find(c => {
              return (
                result._id.type === 'Build' &&
                c.repositoryId === result._id.repositoryId &&
                c.refName === result._id.branch
              );
            })?.conforms,
          });
        }
      } else if (
        !acc.others.some(
          artifact =>
            artifact.type === result._id.type && artifact.alias === result._id.alias
        )
      ) {
        acc.others.push({
          type: result._id.type,
          source: result._id.type,
          alias: result._id.alias,
          isPrimary: result.isPrimary || undefined,
        });
      }

      return acc;
    },
    { builds: {}, others: [] }
  );

  return [...others, ...Object.values(builds)];
};

export const releaseBranchesForRepo = async (
  queryContext: QueryContext,
  repositoryId: string
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  const projectConfig = configForProject(collectionName, project);
  const ignoreStagesBefore = projectConfig?.releasePipelines.ignoreStagesBefore;

  const results = await ReleaseModel.aggregate<{ _id: string }>([
    {
      $match: {
        collectionName,
        project,
        'artifacts.definition.repositoryId': repositoryId,
        'modifiedOn': inDateRange(startDate, endDate),
      },
    },
    ...(ignoreStagesBefore
      ? [
          ...addFilteredEnvsField(ignoreStagesBefore),
          {
            $addFields: {
              hasGoneAhead: {
                $anyElementTrue: {
                  $map: {
                    input: '$filteredEnvs',
                    as: 'env',
                    in: { $ne: ['$$env.status', 'notStarted'] },
                  },
                },
              },
            },
          },
          { $unset: 'filteredEnvs' },
        ]
      : []),
    { $match: { hasGoneAhead: true } },
    { $unwind: '$artifacts' },
    { $match: { 'artifacts.definition.repositoryId': repositoryId } },
    { $project: { branch: '$artifacts.definition.branch' } },
    { $group: { _id: '$branch' } },
  ]);

  return Promise.all(
    results
      .map(r => r._id)
      .map(async refName => {
        return {
          name: refName,
          conforms: await conformsToBranchPolicies({
            collectionName,
            project,
            repositoryId,
            refName,
          }),
        };
      })
  );
};

export const usageByEnvironment = async (
  options: z.infer<typeof pipelineFiltersInputParser>
) => {
  const filter = await createFilter(options);
  const { collectionName, project } = fromContext(options.queryContext);
  const projectConfig = configForProject(collectionName, project);

  const result = await ReleaseModel.aggregate<Record<string, number>>([
    ...filter,
    {
      $addFields:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        projectConfig?.environments?.reduce<any>((acc, env) => {
          acc[`${env}:used`] = isStageUsed(env);
          acc[`${env}:successful`] = isStageSuccessful(env);
          return acc;
        }, {}) || {},
    },
    {
      $group: {
        _id: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...projectConfig?.environments?.reduce<any>((acc, env) => {
          acc[`${env}:used`] = incIfTrue(`$${env}:used`);
          acc[`${env}:successful`] = incIfTrue(`$${env}:successful`);
          return acc;
        }, {}),
      },
    },
  ]);

  return projectConfig?.environments?.reduce<
    Record<string, { total: number; successful: number }>
  >((acc, env) => {
    acc[env] = {
      successful: result[0][`${env}:successful`],
      total: result[0][`${env}:used`],
    };
    return acc;
  }, {});
};

export const getHasReleasesSummary = async (
  queryContext: QueryContext,
  repoIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const result = await ReleaseModel.distinct('artifacts.definition.repositoryId', {
    collectionName,
    project,
    'modifiedOn': inDateRange(startDate, endDate),
    'artifacts.type': 'Build',
  });

  const hasReleasesRepos = repoIds.filter(repoId => result.includes(repoId));

  return hasReleasesRepos.length;
};
