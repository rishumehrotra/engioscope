import { ReleaseStats } from '../../../shared/types';
import { Release, ReleaseDefinition } from '../types-azure';

const initialiseReleaseDetails = (releaseDefinition: ReleaseDefinition): ReleaseStats => ({
  id: releaseDefinition.id,
  name: releaseDefinition.name,
  url: releaseDefinition.url.replace('_apis/Release/definitions/', '_release?definitionId='),
  description: releaseDefinition.description,
  stages: releaseDefinition.environments
    .sort((a, b) => a.rank - b.rank)
    .map(env => ({
      id: env.id,
      name: env.name,
      lastReleaseDate: new Date(0),
      releaseCount: 0,
      successCount: 0
    })),
  repos: {}
});

const addToReleaseStats = (releaseStats: ReleaseStats, release: Release): ReleaseStats => ({
  ...releaseStats,
  stages: releaseStats.stages.map(stage => {
    const matchingStageInRelease = release.environments.find(e => e.name === stage.name);
    if (!matchingStageInRelease) return stage;
    if (matchingStageInRelease.status === 'notStarted') return stage;

    const releaseDate = matchingStageInRelease.deploySteps[matchingStageInRelease.deploySteps.length - 1].lastModifiedOn;

    return {
      ...stage,
      lastReleaseDate: stage.lastReleaseDate > releaseDate ? stage.lastReleaseDate : releaseDate,
      releaseCount: stage.releaseCount + 1,
      successCount: stage.successCount + (matchingStageInRelease.status === 'succeeded' ? 1 : 0)
    };
  }),
  repos: release.artifacts.reduce((acc, artifact) => {
    const repoName = artifact.definitionReference.repository?.name;
    const branch = artifact.definitionReference.branch?.name;

    if (!repoName) return acc;

    return {
      ...acc,
      [repoName]: [...new Set([
        ...(acc[repoName] || []),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        branch!.replace('/refs/heads/', '')
      ].filter(Boolean)).values()]
    };
  }, releaseStats.repos)
});

export default (releaseDefinitionById: (id: number) => ReleaseDefinition | undefined, releases: Release[]) => (
  Object.values(releases.reduce((acc, release) => {
    const releaseDefn = releaseDefinitionById(release.releaseDefinition.id);
    if (!releaseDefn) return acc;

    return {
      ...acc,
      [releaseDefn.id]: addToReleaseStats(
        acc[releaseDefn.id] || initialiseReleaseDetails(releaseDefn),
        release
      )
    };
  }, {} as Record<number, ReleaseStats>))
);
