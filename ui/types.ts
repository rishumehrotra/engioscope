export type Tab = 'repos' | 'releases';

export const repoPageUrlTypes = {
  search: 'string',
  commitsGreaterThanZero: 'boolean',
  buildsGreaterThanZero: 'boolean',
  withFailingLastBuilds: 'boolean',
  techDebtGreaterThan: 'number',
  nonMasterReleases: 'boolean',
  startsWithArtifact: 'boolean',
  stageNamesExists: 'string',
  stageNameExistsNotUsed: 'string'
} as const;

