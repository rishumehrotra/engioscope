export type Tab = 'repos' | 'releases';

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

