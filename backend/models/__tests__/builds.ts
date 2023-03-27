import { it, expect } from 'vitest';
import { getBuildsOverviewForRepository } from '../builds.js';
import { createRepo } from '../../test-helpers/create-repo.js';
import { createBuildDefinition } from '../../test-helpers/create-build-definition.js';
import { createBuild } from '../../test-helpers/create-build.js';

it('gets the build overview', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345);

  const overview = await getBuildsOverviewForRepository({
    collectionName: 'foo',
    project: 'bar',
    startDate: new Date('2022-03-01'),
    endDate: new Date('2023-03-30'),
    repositoryId: 'repo-1',
    repositoryName: 'repo-1',
  });

  expect(overview.length).toBe(1);
  expect(overview[0].totalBuilds).toBe(1);
  expect(overview[0].buildDefinitionId).toBe(12_345);
});
