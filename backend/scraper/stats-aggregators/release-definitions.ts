import type { ReleaseDefinition } from '../types-azure';

export default (releaseDefinitions: ReleaseDefinition[]) => {
  const releaseDefinitionsById: Record<number, ReleaseDefinition> = releaseDefinitions.reduce((acc, rd) => ({
    ...acc,
    [rd.id]: rd
  }), {});

  return (id: number): ReleaseDefinition | undefined => releaseDefinitionsById[id];
};
