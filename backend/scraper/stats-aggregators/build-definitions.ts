import type { BuildDefinition } from '../../models/mongoose-models/BuildDefinitionModel';

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
