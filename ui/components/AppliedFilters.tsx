/* eslint-disable jsx-a11y/control-has-associated-label */
import React from 'react';
import { Close } from '../components/Icons';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { repoPageUrlTypes } from '../types';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);

const FilterTag: React.FC<{ label: string; onClose: () => void }> = ({ label, onClose }) => (
  <span className="ml-2 py-1 pl-3 pr-2 border border-gray-300 rounded-full flex bg-white text-sm">
    <span>{label}</span>
    <button onClick={onClose}><Close className="ml-1" /></button>
  </span>
);

const AppliedFilters: React.FC<{ count: number }> = ({ count }) => {
  const [commitsGreaterThanZero, setCommitsGreaterThanZero] = useUrlParams<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero, setBuildsGreaterThanZero] = useUrlParams<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds, setWithFailingLastBuilds] = useUrlParams<boolean>('withFailingLastBuilds');
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useUrlParams<number>('techDebtGreaterThan');

  const [nonMasterReleases, setNonMasterReleases] = useUrlParams<boolean>('nonMasterReleases');
  const [notStartsWithArtifact, setNotStartsWithArtifact] = useUrlParams<boolean>('notStartsWithArtifact');
  const [stageNameExists, setStageNameExists] = useUrlParams<string>('stageNameExists');
  const [stageNameExistsNotUsed, setStageNameExistsNotUsed] = useUrlParams<string>('stageNameExistsNotUsed');

  const isFilterApplied = commitsGreaterThanZero || buildsGreaterThanZero || withFailingLastBuilds || (techDebtGreaterThan !== undefined)
  || nonMasterReleases || notStartsWithArtifact || stageNameExists || stageNameExistsNotUsed;
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

      {
        nonMasterReleases ? (
          <FilterTag label="Has commits" onClose={() => setNonMasterReleases(undefined)} />
        ) : null
      }
      {
        notStartsWithArtifact ? (
          <FilterTag label="Has builds" onClose={() => setNotStartsWithArtifact(undefined)} />
        ) : null
      }
      {
        stageNameExists ? (
          <FilterTag label="Has failing builds" onClose={() => setStageNameExists(undefined)} />
        ) : null
      }
      {
        stageNameExistsNotUsed ? (
          <FilterTag label={`Tech debt > ${stageNameExistsNotUsed}`} onClose={() => setStageNameExistsNotUsed(undefined)} />
        ) : null
      }
    </div>
  );
};

export default AppliedFilters;
