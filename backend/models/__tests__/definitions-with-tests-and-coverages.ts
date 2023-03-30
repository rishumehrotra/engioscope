import { it, expect } from 'vitest';
import { createBuildDefinition } from '../../test-helpers/create-build-definition.js';
import { createBuild } from '../../test-helpers/create-build.js';
import { createCoverage } from '../../test-helpers/create-coverage.js';
import { createRepo } from '../../test-helpers/create-repo.js';
import { createTestRun } from '../../test-helpers/create-test-run.js';
import { needsDB } from '../../test-helpers/mongo-memory-server.js';
import { getDefinitionsWithTestsAndCoverages } from '../testruns.js';

needsDB();

it('should return the correct count of tests and coverages (0 test in 1 pipeline, 0 coverage)', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');

  const counts = await getDefinitionsWithTestsAndCoverages(
    'foo',
    'bar',
    new Date('2022-01-01'),
    new Date('2022-03-31')
  );

  expect(counts.defsWithTests).toBe(0);
  expect(counts.defsWithCoverage).toBe(0);
});

it('should return the correct count of tests and coverages (1 test in 1 pipeline, 0 coverage)', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));
  await createTestRun('foo', 'bar', 123, 12_345);

  const counts = await getDefinitionsWithTestsAndCoverages(
    'foo',
    'bar',
    new Date('2022-01-01'),
    new Date('2022-03-31')
  );

  expect(counts.defsWithTests).toBe(1);
  expect(counts.defsWithCoverage).toBe(0);
});

it('should return the correct count of tests and coverages (2 test in 2 pipelines, 1 coverage)', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuildDefinition('foo', 'bar', 54_321, 'repo-1');
  // Build and tests for pipeline def id 123
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));
  await createTestRun('foo', 'bar', 123, 12_345);
  // Build, tests and coverage for pipeline def id 321
  await createBuild('foo', 'bar', 'repo-1', 321, 54_321, new Date('2022-03-25'));
  await createTestRun('foo', 'bar', 321, 54_321);
  await createCoverage('foo', 'bar', 321);

  const counts = await getDefinitionsWithTestsAndCoverages(
    'foo',
    'bar',
    new Date('2022-01-01'),
    new Date('2022-03-31')
  );

  expect(counts.defsWithTests).toBe(2);
  expect(counts.defsWithCoverage).toBe(1);
});

it('should return the correct count of tests and coverages (2 test in 1 pipeline, 0 coverage)', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  // Build, test and coverage for def id 1233
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));
  await createTestRun('foo', 'bar', 123, 12_345);
  await createCoverage('foo', 'bar', 123);
  // Again, build, test and coverage for def id 1233
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));
  await createTestRun('foo', 'bar', 123, 12_345);
  await createCoverage('foo', 'bar', 123);

  const counts = await getDefinitionsWithTestsAndCoverages(
    'foo',
    'bar',
    new Date('2022-01-01'),
    new Date('2022-03-31')
  );

  expect(counts.defsWithTests).toBe(1);
  expect(counts.defsWithCoverage).toBe(1);
});
