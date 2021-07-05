import { EnvironmentStatus } from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import aggregateReleases from '../aggregate-releases';

test('it should aggregate releases (single release)', () => {
  const byRepoId = aggregateReleases([
    {
      artifacts: [{
        definitionReference: {
          repository: { id: 'repo-id-1', name: 'some-repo-1' },
          branch: { id: 'refs/heads/master', name: 'refs/heads/master' }
        }
      }],
      environments: [{
        name: 'SIT',
        status: EnvironmentStatus.Succeeded,
        deploySteps: [{ lastModifiedOn: new Date('2020-10-10T10:10') }]
      }]
    }
  ]);

  expect(byRepoId('repo-id-1')).toMatchSnapshot();
  expect(byRepoId('something-else')).toMatchSnapshot();
});

test('it should aggregate releases (two releases, different environments)', () => {
  const byRepoId = aggregateReleases([
    {
      artifacts: [{
        definitionReference: {
          repository: { id: 'repo-id-1', name: 'some-repo-1' },
          branch: { id: 'refs/heads/master', name: 'refs/heads/master' }
        }
      }],
      environments: [{
        name: 'SIT',
        status: EnvironmentStatus.Succeeded,
        deploySteps: [{ lastModifiedOn: new Date('2020-10-10T10:10') }]
      }]
    },
    {
      artifacts: [{
        definitionReference: {
          repository: { id: 'repo-id-1', name: 'some-repo-1' },
          branch: { id: 'refs/heads/master', name: 'refs/heads/master' }
        }
      }],
      environments: [{
        name: 'Preprod',
        status: EnvironmentStatus.Succeeded,
        deploySteps: [{ lastModifiedOn: new Date('2020-10-10T10:10') }]
      }]
    }
  ]);

  expect(byRepoId('repo-id-1')).toMatchSnapshot();
});

test('it should aggregate releases (mutiple releases, repeating environments)', () => {
  const byRepoId = aggregateReleases([
    {
      artifacts: [{
        definitionReference: {
          repository: { id: 'repo-id-1', name: 'some-repo-1' },
          branch: { id: 'refs/heads/master', name: 'refs/heads/master' }
        }
      }],
      environments: [{
        name: 'SIT',
        status: EnvironmentStatus.Succeeded,
        deploySteps: [{ lastModifiedOn: new Date('2020-10-10T10:10') }]
      }, {
        name: 'preprod',
        status: EnvironmentStatus.Succeeded,
        deploySteps: [{ lastModifiedOn: new Date('2020-10-10T10:10') }]
      }]
    },
    {
      artifacts: [{
        definitionReference: {
          repository: { id: 'repo-id-1', name: 'some-repo-1' },
          branch: { id: 'refs/heads/master', name: 'refs/heads/master' }
        }
      }],
      environments: [{
        name: 'SIT',
        status: EnvironmentStatus.Succeeded,
        deploySteps: [{ lastModifiedOn: new Date('2020-10-10T10:10') }]
      }, {
        name: 'preprod',
        status: EnvironmentStatus.Succeeded,
        deploySteps: [{ lastModifiedOn: new Date('2020-10-10T10:10') }]
      }]
    }
  ]);

  expect(byRepoId('repo-id-1')).toMatchSnapshot();
});
