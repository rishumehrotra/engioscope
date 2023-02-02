import type { BuildDefinition } from '../../models/build-definitions.js';

export default (buildDefinitions: BuildDefinition[]) => {
  const buildDefinitionsByRepoId = buildDefinitions.reduce<
    Record<string, BuildDefinition[]>
  >((acc, buildDefinition) => {
    const repoId = buildDefinition.repositoryId || 'no-repo-id';
    acc[repoId] = acc[repoId] || [];
    acc[repoId].push(buildDefinition);
    return acc;
  }, {});

  return (repoId: string | 'no-repo-id') => buildDefinitionsByRepoId[repoId] || [];
};
