export type Tab = 'repos' | 'release-pipelines';

export const repoPageUrlTypes = {
  search: 'string',
  commitsGreaterThanZero: 'boolean',
  buildsGreaterThanZero: 'boolean',
  withFailingLastBuilds: 'boolean',
  techDebtGreaterThan: 'number',
  nonMasterReleases: 'boolean',
  notStartsWithArtifact: 'boolean',
  stageNameExists: 'string',
  stageNameExistsNotUsed: 'string'
} as const;

