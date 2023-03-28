import { expect, it } from 'vitest';
import { createBuildDefinition } from '../../test-helpers/create-build-definition.js';
import { createBuild } from '../../test-helpers/create-build.js';
import { createRepo } from '../../test-helpers/create-repo.js';
import { getCoveragesByWeek } from '../testruns.js';
import { createCoverage } from '../../test-helpers/create-coverage';

it('should give right no of weeks for query period', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-03-25'));
  await createCoverage('foo', 'bar', 122);

  const coverageByWeek = await getCoveragesByWeek(
    'foo',
    'bar',
    ['repo-1'],
    new Date('2022-01-01'),
    new Date('2022-03-30')
  );
  expect(coverageByWeek.length).toBe(12);
});

it('should not give coverage counts when there are no coverages', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-03-25'));

  const coverageByWeek = await getCoveragesByWeek(
    'foo',
    'bar',
    ['repo-1'],
    new Date('2022-01-01'),
    new Date('2022-03-30')
  );

  expect(coverageByWeek.length).toBe(12);
  expect(coverageByWeek.every(t => t.coveredBranches === 0)).toBe(true);
  expect(coverageByWeek.every(t => t.totalBranches === 0)).toBe(true);
});

it('should give coverage counts when there are coverages', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-01-02'));
  await createCoverage('foo', 'bar', 122);

  const coverageByWeek = await getCoveragesByWeek(
    'foo',
    'bar',
    ['repo-1'],
    new Date('2022-01-01'),
    new Date('2022-03-30')
  );

  expect(coverageByWeek.length).toBe(12);
  expect(coverageByWeek.every(t => t.coveredBranches === 5)).toBe(true);
  expect(coverageByWeek.every(t => t.totalBranches === 10)).toBe(true);
});

it('should handle missing coverage counts with no past data', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-02-15'));

  await createCoverage('foo', 'bar', 122);

  const coverageByWeek = await getCoveragesByWeek(
    'foo',
    'bar',
    ['repo-1'],
    new Date('2022-01-01'),
    new Date('2022-03-30')
  );

  expect(coverageByWeek.length).toBe(12);
  expect(coverageByWeek.slice(0, 5).every(t => t.coveredBranches === 0)).toBe(true);
  expect(coverageByWeek.slice(0, 5).every(t => t.totalBranches === 0)).toBe(true);

  expect(coverageByWeek.slice(5).every(t => t.coveredBranches === 5)).toBe(true);
  expect(coverageByWeek.slice(5).every(t => t.totalBranches === 10)).toBe(true);
});

it('should handle missing coverage counts with past data', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 121, 12_345, new Date('2021-12-15'));
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-02-30'));
  await createCoverage('foo', 'bar', 121, 7);
  await createCoverage('foo', 'bar', 122);

  const coverageByWeek = await getCoveragesByWeek(
    'foo',
    'bar',
    ['repo-1'],
    new Date('2022-01-01'),
    new Date('2022-03-30')
  );

  expect(coverageByWeek.length).toBe(12);
  expect(coverageByWeek.slice(0, 7).every(t => t.coveredBranches === 7)).toBe(true);
  expect(coverageByWeek.slice(0, 7).every(t => t.totalBranches === 10)).toBe(true);

  expect(coverageByWeek.slice(7).every(t => t.coveredBranches === 5)).toBe(true);
  expect(coverageByWeek.slice(7).every(t => t.totalBranches === 10)).toBe(true);
});

it('should handle missing coverages', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-02-30'));
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-20'));
  await createCoverage('foo', 'bar', 122);

  const coverageByWeek = await getCoveragesByWeek(
    'foo',
    'bar',
    ['repo-1'],
    new Date('2022-01-01'),
    new Date('2022-03-30')
  );
  expect(coverageByWeek).toMatchSnapshot();
});
