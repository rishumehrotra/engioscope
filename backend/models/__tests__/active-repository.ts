import { it, expect } from 'vitest';
import { createRepo } from '../../test-helpers/create-repo.js';
import { createBuild } from '../../test-helpers/create-build.js';
import { needsDB } from '../../test-helpers/mongo-memory-server.js';
import { getActiveRepos } from '../repo-listing.js';
import { createCommit } from '../../test-helpers/create-commit.js';

needsDB();

it('should not give active repository when no repository', async () => {
  const searchTerm = undefined;
  const groupsIncluded = undefined;
  const activeRepos = await getActiveRepos(
    'foo',
    'bar',
    new Date('2022-03-25'),
    new Date('2022-06-25'),
    searchTerm,
    groupsIncluded
  );

  expect(activeRepos.length).toBe(0);
});
it('should not give active repository when no builds or commits in given duration', async () => {
  await createRepo('foo', 'bar', 'repo-1');
  const searchTerm = undefined;
  const groupsIncluded = undefined;
  const activeRepos = await getActiveRepos(
    'foo',
    'bar',
    new Date('2022-03-25'),
    new Date('2022-06-25'),
    searchTerm,
    groupsIncluded
  );

  expect(activeRepos.length).toBe(0);
});

it('should give active repository when there is a build in given duration', async () => {
  await createRepo('foo', 'bar', 'repo-1');

  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));
  const searchTerm = undefined;
  const groupsIncluded = undefined;
  const activeRepos = await getActiveRepos(
    'foo',
    'bar',
    new Date('2022-03-25'),
    new Date('2022-06-25'),
    searchTerm,
    groupsIncluded
  );

  expect(activeRepos.length).toBe(1);
});

it('should give active repository when there is a commit in given duration', async () => {
  await createRepo('foo', 'bar', 'repo-1');

  await createCommit('foo', 'bar', 'repo-1', '123', '2022-03-25', '2022-03-25');
  const searchTerm = undefined;
  const groupsIncluded = undefined;
  const activeRepos = await getActiveRepos(
    'foo',
    'bar',
    new Date('2022-03-25'),
    new Date('2022-06-25'),
    searchTerm,
    groupsIncluded
  );

  expect(activeRepos.length).toBe(1);
});

it('should give unique active repository when there are both commits and builds in given duration', async () => {
  await createRepo('foo', 'bar', 'repo-1');

  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));
  await createCommit('foo', 'bar', 'repo-1', '123', '2022-03-25', '2022-03-25');
  const searchTerm = undefined;
  const groupsIncluded = undefined;
  const activeRepos = await getActiveRepos(
    'foo',
    'bar',
    new Date('2022-03-25'),
    new Date('2022-06-25'),
    searchTerm,
    groupsIncluded
  );

  expect(activeRepos.length).toBe(1);
});

it('should give active repository for matching search terms and having builds and commits', async () => {
  await createRepo('foo', 'bar', 'repo-1');

  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));
  await createCommit('foo', 'bar', 'repo-1', '123', '2022-03-25', '2022-03-25');
  const searchTerm = 'repo-1';
  const groupsIncluded = undefined;
  const activeRepos = await getActiveRepos(
    'foo',
    'bar',
    new Date('2022-03-25'),
    new Date('2022-06-25'),
    searchTerm,
    groupsIncluded
  );

  expect(activeRepos.length).toBe(1);
});

it('should give active repository if not matching search terms', async () => {
  await createRepo('foo', 'bar', 'repo-1');

  await createBuild('foo', 'bar', 'repo-1', 123, 12_345, new Date('2022-03-25'));
  await createCommit('foo', 'bar', 'repo-1', '123', '2022-03-25', '2022-03-25');
  const searchTerm = 'repo-2';
  const groupsIncluded = undefined;
  const activeRepos = await getActiveRepos(
    'foo',
    'bar',
    new Date('2022-03-25'),
    new Date('2022-06-25'),
    searchTerm,
    groupsIncluded
  );

  expect(activeRepos.length).toBe(0);
});
