import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { map, prop, uniqBy } from 'rambda';
import type { FeatureToggle } from '../../../shared/types.js';

const featureToggles: Promise<FeatureToggle[]> = readFile(
  join(process.cwd(), 'ft.json'),
  'utf8'
)
  .then(json => JSON.parse(json) as FeatureToggle[])
  .then(
    map(ft => ({
      ...ft,
      created: new Date(ft.created),
      expired: ft.expired ? new Date(ft.expired) : undefined,
      updated: ft.updated ? new Date(ft.updated) : undefined,
    }))
  )
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .catch(() => []);

const featureTogglesByRepoId = featureToggles
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .then(fts =>
    fts.reduce<Record<string, FeatureToggle[]>>((acc, ft) => {
      ft.repoIds.forEach(repoId => {
        acc[repoId] = acc[repoId] || [];
        acc[repoId].push(ft);
      });
      return acc;
    }, {})
  );

export const featureTogglesForRepos = async (repoIds: string[]) => {
  const ftByRepoId = await featureTogglesByRepoId;

  return uniqBy(
    prop('featureId'),
    repoIds.reduce<FeatureToggle[]>((acc, repoId) => {
      acc.push(...(ftByRepoId[repoId] || []));
      return acc;
    }, [])
  );
};
