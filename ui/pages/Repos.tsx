/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProjectRepoAnalysis, RepoAnalysis } from '../../shared/types';
import AlertMessage from '../components/AlertMessage';
import RepoHealth from '../components/RepoHealth';
import AppliedFilters from '../components/AppliedFilters';
import { useReposSortBy, useSortOrder } from '../hooks/query-params-hooks';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { repoPageUrlTypes, reposSortByParams } from '../types';
import { fetchProjectMetrics } from '../network';
import { dontFilter } from '../helpers';
import { assertUnreachable } from '../../shared/helpers';
import { useSetProjectDetails } from '../hooks/project-details-hooks';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);

const qualityGateSortName = (codeQuality: RepoAnalysis['codeQuality']) => {
  if (!codeQuality) return 'd';
  if (codeQuality.qualityGate === 'ok') return 'a';
  if (codeQuality.qualityGate === 'warn') return 'b';
  return 'c';
};

const sortByIndicators = (sortBy: typeof reposSortByParams[number], sort: number) => (a: RepoAnalysis, b: RepoAnalysis) => {
  switch (sortBy) {
    case 'Builds': return sort * ((a.builds?.count || 0) - (b.builds?.count || 0));
    case 'Branches': return sort * (a.branches.total - b.branches.total);
    case 'Commits': return sort * (a.commits.count - b.commits.count);
    case 'Pull requests': return sort * (a.prs.total - b.prs.total);
    case 'Tests': return sort * ((a.tests?.total || 0) - (b.tests?.total || 0));
    case 'Code quality': return sort * -1 * qualityGateSortName(a.codeQuality).localeCompare(qualityGateSortName(b.codeQuality));
    default: return assertUnreachable(sortBy);
  }
};

const bySearchTerm = (searchTerm: string) => (repo: RepoAnalysis) => (
  repo.name.toLowerCase().includes(searchTerm.toLowerCase())
);
const byCommitsGreaterThanZero = (repo: RepoAnalysis) => repo.commits.count;
const byBuildsGreaterThanZero = (repo: RepoAnalysis) => (repo.builds?.count || 0) > 0;
const byFailingLastBuilds = (repo: RepoAnalysis) => (
  repo.builds?.pipelines.some(pipeline => pipeline.status.type !== 'succeeded')
);
const byTechDebtMoreThanDays = (techDebtMoreThanDays: number) => (repo: RepoAnalysis) => (
  (repo.codeQuality?.techDebt || 0) / (24 * 60) > techDebtMoreThanDays
);

const Repos: React.FC = () => {
  const { collection, project } = useParams<{ collection: string; project: string }>();
  const setProjectDetails = useSetProjectDetails();
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectRepoAnalysis | undefined>();
  const [sort] = useSortOrder();
  const [sortBy] = useReposSortBy();
  const [search] = useUrlParams<string>('search');
  const [commitsGreaterThanZero] = useUrlParams<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero] = useUrlParams<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds] = useUrlParams<boolean>('withFailingLastBuilds');
  const [techDebtMoreThanDays] = useUrlParams<number>('techDebtGreaterThan');

  useEffect(() => {
    fetchProjectMetrics(collection, project).then(repoAnalysis => {
      setProjectAnalysis(repoAnalysis);
      setProjectDetails(repoAnalysis);
    });
  }, [collection, project, setProjectDetails]);

  if (!projectAnalysis) return <div>Loading...</div>;

  const repos = projectAnalysis.repos
    .filter(search === undefined ? dontFilter : bySearchTerm(search))
    .filter(!commitsGreaterThanZero ? dontFilter : byCommitsGreaterThanZero)
    .filter(!buildsGreaterThanZero ? dontFilter : byBuildsGreaterThanZero)
    .filter(!withFailingLastBuilds ? dontFilter : byFailingLastBuilds)
    .filter(techDebtMoreThanDays === undefined ? dontFilter : byTechDebtMoreThanDays(techDebtMoreThanDays))
    .sort(sortByIndicators(sortBy, sort === 'asc' ? 1 : -1));

  return (
    <div>
      <AppliedFilters count={repos.length} />
      {
        repos.length ? repos.map(repo => (
          <RepoHealth repo={repo} key={repo.name} />
        )) : <AlertMessage message="No repos found" />
      }
    </div>
  );
};

export default Repos;
