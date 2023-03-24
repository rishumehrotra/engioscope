import { it, expect } from 'vitest';
import { bulkSaveRepositories } from '../../crons/repos.js';
import { getRepositories } from '../repos.js';

it('connects to mongodb', async () => {
  const repos = await getRepositories('foo', 'bar');
  expect(repos.length).toBe(0);

  await bulkSaveRepositories('foo')([
    {
      id: 'repo-1',
      name: 'repo-1',
      project: {
        id: 'project-1',
        lastUpdatedTime: new Date('2022-01-01'),
        name: 'bar',
        state: 'wellFormed',
        visibility: 'public',
      },
      remoteUrl: 'http://example.com/',
      size: 123,
      sshUrl: 'ssh://example.com',
      url: 'http://example.com',
      webUrl: 'http://example.com',
      defaultBranch: 'refs/heads/master',
    },
  ]);

  const reposAfter = await getRepositories('foo', 'bar');
  expect(reposAfter.length).toBe(1);
});
