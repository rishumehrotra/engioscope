import { count, incrementBy } from './reducer-utils';
import type { RepoAnalysis } from './types';

export const isDeprecated = (repo: RepoAnalysis) => (
  (
    repo.name.toLowerCase().endsWith('_exp')
      || repo.name.toLowerCase().endsWith('_deprecated')
  )
    && ((repo.builds?.count || 0) === 0)
    && (repo.commits.count === 0)
);

export const numberOfTests = (repo: RepoAnalysis) => repo.tests?.total || 0;
export const numberOfBuilds = (repo: RepoAnalysis) => repo.builds?.count || 0;

export const totalTests = count(incrementBy(numberOfTests));
export const totalBuilds = count(incrementBy(numberOfBuilds));

export const totalTestsByWeek = (repos: RepoAnalysis[]) => (
  repos.reduce((acc, repo) => {
    if (!repo.tests) return acc;

    return repo.tests.pipelines.reduce((acc, pipeline) => (
      pipeline.testsByWeek.reduce((acc, testCount, index) => {
        acc[index] = (acc[index] || 0) + testCount;
        return acc;
      }, acc)
    ), acc);
  }, [0, 0, 0, 0])
);
