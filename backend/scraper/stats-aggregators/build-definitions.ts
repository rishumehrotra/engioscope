import type { BuildDefinitionReference } from '../types-azure';

export default (buildDefinitions: BuildDefinitionReference[]) => {
  const buildDefinitionsByRepoId = (
    buildDefinitions.reduce<Record<string, BuildDefinitionReference[]>>((acc, buildDefinition) => {
      const repoId = buildDefinition.latestBuild?.repository.id || 'no-repo-id';
      acc[repoId] = acc[repoId] || [];
      acc[repoId].push(buildDefinition);
      return acc;
    }, {})
  );

  return (repoId: string | 'no-repo-id') => buildDefinitionsByRepoId[repoId] || [];
};
