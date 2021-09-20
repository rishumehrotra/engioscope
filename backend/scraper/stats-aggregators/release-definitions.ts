import type { ReleaseDefinition } from '../types-azure';

export default (releaseDefinitions: ReleaseDefinition[]) => {
  const releaseDefinitionsById = releaseDefinitions.reduce<Record<number, ReleaseDefinition>>((acc, rd) => {
    acc[rd.id] = rd;
    return acc;
  }, {});

  return (id: number): ReleaseDefinition | undefined => releaseDefinitionsById[id];
};
