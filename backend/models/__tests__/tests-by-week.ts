import { it, expect } from 'vitest';
import { createBuildDefinition } from '../../test-helpers/create-build-definition.js';
import { createBuild } from '../../test-helpers/create-build.js';
import { createRepo } from '../../test-helpers/create-repo.js';
import { createTestRun, getTestruns } from '../../test-helpers/create-test-run.js';
import { needsDB } from '../../test-helpers/mongo-memory-server.js';
import { getTestsAndCoverageByWeek } from '../testruns.js';

needsDB();

it('Given buildId should give a testrun for it', async () => {
  // Arrange
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));
  await createTestRun('foo', 'bar', 123, 12_345);
  // Act
  const tests = await getTestruns('foo', 'bar', 123);
  // Assert
  expect(tests.length).toBe(1);
});

it('should give right no of weeks for query period', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-03-25'));
  await createTestRun('foo', 'bar', 122, 12_345);

  const { testsByWeek } = await getTestsAndCoverageByWeek(
    ['foo', 'bar', new Date('2022-01-01'), new Date('2022-03-26')],
    ['repo-1']
  );

  expect(testsByWeek.length).toBe(12);
});

it('should not give test counts when there are no testruns', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-03-25'));

  const { testsByWeek } = await getTestsAndCoverageByWeek(
    ['foo', 'bar', new Date('2022-01-01'), new Date('2022-03-26')],
    ['repo-1']
  );

  expect(testsByWeek.length).toBe(0);
});

it('should give test counts when there are testruns', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-01-02'));
  await createTestRun('foo', 'bar', 122, 12_345);
  const { testsByWeek } = await getTestsAndCoverageByWeek(
    ['foo', 'bar', new Date('2022-01-01'), new Date('2022-03-26')],
    ['repo-1']
  );
  expect(testsByWeek.length).toBe(12);
  expect(testsByWeek.every(t => t.hasTests && t.passedTests === 10)).toBe(true);
  expect(testsByWeek.every(t => t.hasTests && t.totalTests === 10)).toBe(true);
});

it('should handle missing test run counts with no past data', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-02-15'));

  await createTestRun('foo', 'bar', 122, 12_345);

  const { testsByWeek } = await getTestsAndCoverageByWeek(
    ['foo', 'bar', new Date('2022-01-01'), new Date('2022-03-26')],
    ['repo-1']
  );

  expect(testsByWeek.length).toBe(12);
  expect(testsByWeek.slice(0, 6).every(t => !t.hasTests)).toBe(true);
  expect(testsByWeek.slice(6).every(t => t.hasTests && t.passedTests === 10)).toBe(true);
  expect(testsByWeek.slice(6).every(t => t.hasTests && t.totalTests === 10)).toBe(true);
});

it('should handle missing test run counts with past data', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 121, 12_345, new Date('2021-12-15'));
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-02-30'));

  await createTestRun('foo', 'bar', 122, 12_345);

  await createTestRun('foo', 'bar', 121, 12_345, 15);

  const { testsByWeek } = await getTestsAndCoverageByWeek(
    ['foo', 'bar', new Date('2022-01-01'), new Date('2022-03-26')],
    ['repo-1']
  );

  expect(testsByWeek.length).toBe(12);
  expect(testsByWeek.slice(0, 8).every(t => t.hasTests && t.passedTests === 15)).toBe(
    true
  );
  expect(testsByWeek.slice(0, 8).every(t => t.hasTests && t.totalTests === 15)).toBe(
    true
  );

  expect(testsByWeek.slice(8).every(t => t.hasTests && t.passedTests === 10)).toBe(true);
  expect(testsByWeek.slice(8).every(t => t.hasTests && t.totalTests === 10)).toBe(true);
});

it('should handle missing test run', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  await createBuildDefinition('foo', 'bar', 12_345, 'repo-1');
  await createBuild('foo', 'bar', 'repo-1', 122, 12_345, new Date('2022-02-30'));
  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-20'));
  await createTestRun('foo', 'bar', 122, 12_345);

  const { testsByWeek } = await getTestsAndCoverageByWeek(
    ['foo', 'bar', new Date('2022-01-01'), new Date('2022-03-26')],
    ['repo-1']
  );

  expect(testsByWeek).toMatchSnapshot();
});
