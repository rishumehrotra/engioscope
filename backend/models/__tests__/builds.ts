import { it, expect } from 'vitest';
import { getBuilds, getBuildsOverviewForRepository } from '../builds.js';
import { createRepo } from '../../test-helpers/create-repo.js';
import { createBuildDefinition } from '../../test-helpers/create-build-definition.js';
import { createBuild } from '../../test-helpers/create-build.js';
import { needsDB } from '../../test-helpers/mongo-memory-server.js';

needsDB();

it('Insert build', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));

  const builds = await getBuilds('foo', 'bar', new Date('2022-03-01'));

  expect(builds.length).toBe(1);
  expect(builds[0].id).toBe(123);
  expect(builds[0].definition.id).toBe(12_345);
});
it('Gets the build overview', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345);

  const overview = await getBuildsOverviewForRepository({
    queryContext: ['foo', 'bar', new Date('2022-03-01'), new Date('2023-03-30')],
    repositoryId: 'repo-1',
  });

  expect(overview.length).toBe(1);
  expect(overview[0].totalBuilds).toBe(1);
  expect(overview[0].buildDefinitionId).toBe(12_345);
});
