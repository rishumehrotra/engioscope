import { it, expect } from 'vitest';
import { createBuildDefinition } from '../../test-helpers/create-build-definition.js';
import { createBuild } from '../../test-helpers/create-build.js';
import { createRepo } from '../../test-helpers/create-repo.js';
import { createTestRun } from '../../test-helpers/create-test-run.js';
import { getTestsByWeek } from '../testruns.js';

it('should give a weekly spread of tests', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));
  await createTestRun('foo', 'bar', 123, 12_345);

  const testsByWeek = await getTestsByWeek(
    'foo',
    'bar',
    ['repo-1'],
    new Date('2022-01-01'),
    new Date('2022-03-30')
  );

  console.log(testsByWeek);
  expect(testsByWeek.length).toBe(12);
});
