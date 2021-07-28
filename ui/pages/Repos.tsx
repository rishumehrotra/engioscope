/* eslint-disable jsx-a11y/control-has-associated-label */
import React from 'react';
import { RepoAnalysis } from '../../shared/types';
import AlertMessage from '../components/AlertMessage';
import { Close } from '../components/Icons';
import RepoHealth from '../components/RepoHealth';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { repoPageUrlTypes } from '../types';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);

const FilterTag: React.FC<{label: string; onClose: () => void}> = ({ label, onClose }) => (
  <span className="ml-2 py-1 pl-3 pr-2 border border-yellow-500 rounded-full flex">
    <span>{label}</span>
    <button onClick={onClose}><Close className="ml-1" /></button>
  </span>
);

const AppliedFilters:React.FC<{count: number}> = ({ count }) => {
  const [commitsGreaterThanZero, setCommitsGreaterThanZero] = useUrlParams<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero, setBuildsGreaterThanZero] = useUrlParams<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds, setWithFailingLastBuilds] = useUrlParams<boolean>('withFailingLastBuilds');
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useUrlParams<number>('techDebtGreaterThan');
  const isFilterApplied = commitsGreaterThanZero || buildsGreaterThanZero || withFailingLastBuilds || (techDebtGreaterThan !== undefined);
  if (!isFilterApplied) return null;

  return (
    <div className="mb-4 -mt-4 bg-yellow-100 border-t-2 border-b-2 border-yellow-200 py-2 px-4 flex items-center text-md text-gray-800">
      {`Showing ${count} repos with filters applied: `}
      {
        commitsGreaterThanZero ? (
          <FilterTag label="Has commits" onClose={() => setCommitsGreaterThanZero(undefined)} />
        ) : null
      }
      {
        buildsGreaterThanZero ? (
          <FilterTag label="Has builds" onClose={() => setBuildsGreaterThanZero(undefined)} />
        ) : null
      }
      {
        withFailingLastBuilds ? (
          <FilterTag label="Has failing builds" onClose={() => setWithFailingLastBuilds(undefined)} />
        ) : null
      }
      {
        techDebtGreaterThan ? (
          <FilterTag label={`Tech debt > ${techDebtGreaterThan}`} onClose={() => setTechDebtGreaterThan(undefined)} />
        ) : null
      }
    </div>
  );
};

const Repos:React.FC<{repos: RepoAnalysis[]}> = ({ repos }) => (
  <div>
    <AppliedFilters count={repos.length} />
    {
      repos.length ? repos.map(repo => (
        <RepoHealth repo={repo} key={repo.name} />
      )) : <AlertMessage message="No repos found" />
    }
  </div>
);

export default Repos;
