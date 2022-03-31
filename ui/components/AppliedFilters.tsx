/* eslint-disable jsx-a11y/control-has-associated-label */
import React from 'react';
import { useQueryParam } from 'use-query-params';
import usePageName from '../hooks/use-page-name';
import type { Tab } from '../types';
import { Close } from './common/Icons';

const FilterTag: React.FC<{ label: string; onClose: () => void }> = ({ label, onClose }) => (
  <span className="ml-1 py-1 pl-3 pr-2 border border-gray-300 rounded-full flex bg-white text-sm">
    <span>{label}</span>
    <button onClick={onClose}><Close className="ml-1" /></button>
  </span>
);

const AppliedFilters: React.FC<{ count: number; type: Tab }> = ({ count, type = 'repos' }) => {
  const pageName = usePageName();

  const [search, setSearch] = useQueryParam<string | undefined>('search');

  const [commitsGreaterThanZero, setCommitsGreaterThanZero] = useQueryParam<boolean | undefined>('commitsGreaterThanZero');
  const [buildsGreaterThanZero, setBuildsGreaterThanZero] = useQueryParam<boolean | undefined>('buildsGreaterThanZero');
  const [withFailingLastBuilds, setWithFailingLastBuilds] = useQueryParam<boolean | undefined>('withFailingLastBuilds');
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useQueryParam<number | undefined>('techDebtGreaterThan');
  const [selectedGroupLabels, setSelectedGroupLabels] = useQueryParam<string[] | undefined>('group');

  const [nonMasterReleases, setNonMasterReleases] = useQueryParam<boolean | undefined>('nonMasterReleases');
  const [notStartsWithArtifact, setNotStartsWithArtifact] = useQueryParam<boolean | undefined>('notStartsWithArtifact');
  const [stageNameExists, setStageNameExists] = useQueryParam<string | undefined>('stageNameExists');
  const [stageNameExistsNotUsed, setStageNameExistsNotUsed] = useQueryParam<string | undefined>('stageNameExistsNotUsed');
  const [nonPolicyConforming, setNonPolicyConforming] = useQueryParam<boolean | undefined>('nonPolicyConforming');

  const isFilterApplied = search || commitsGreaterThanZero || buildsGreaterThanZero || withFailingLastBuilds
  || (techDebtGreaterThan !== undefined) || selectedGroupLabels || nonMasterReleases || notStartsWithArtifact
  || stageNameExists || stageNameExistsNotUsed || nonPolicyConforming;
  if (!isFilterApplied) return <div />;

  return (
    <div className="w-auto flex flex-wrap items-center text-gray-800 mb-2">
      {`Showing ${count} ${pageName(type, count).toLowerCase()} with filters applied: `}
      {
        search ? (
          <FilterTag label={`Search: ${search}`} onClose={() => setSearch(undefined, 'replaceIn')} />
        ) : null
      }
      {
        commitsGreaterThanZero ? (
          <FilterTag label="Has commits" onClose={() => setCommitsGreaterThanZero(undefined, 'replaceIn')} />
        ) : null
      }
      {
        buildsGreaterThanZero ? (
          <FilterTag label="Has builds" onClose={() => setBuildsGreaterThanZero(undefined, 'replaceIn')} />
        ) : null
      }
      {
        withFailingLastBuilds ? (
          <FilterTag label="Has failing builds" onClose={() => setWithFailingLastBuilds(undefined, 'replaceIn')} />
        ) : null
      }
      {
        techDebtGreaterThan ? (
          <FilterTag label={`Tech debt > ${techDebtGreaterThan}`} onClose={() => setTechDebtGreaterThan(undefined, 'replaceIn')} />
        ) : null
      }
      {
        selectedGroupLabels ? (
          <FilterTag label={`Group: ${selectedGroupLabels}`} onClose={() => setSelectedGroupLabels(undefined, 'replaceIn')} />
        ) : null
      }

      {
        nonMasterReleases ? (
          <FilterTag label="Non-master releases" onClose={() => setNonMasterReleases(undefined, 'replaceIn')} />
        ) : null
      }
      {
        notStartsWithArtifact ? (
          <FilterTag label="No starting artifact" onClose={() => setNotStartsWithArtifact(undefined, 'replaceIn')} />
        ) : null
      }
      {
        stageNameExists ? (
          <FilterTag label={`Has stage: ${stageNameExists}`} onClose={() => setStageNameExists(undefined, 'replaceIn')} />
        ) : null
      }
      {
        stageNameExistsNotUsed ? (
          <FilterTag label={`Unused stage: ${stageNameExistsNotUsed}`} onClose={() => setStageNameExistsNotUsed(undefined, 'replaceIn')} />
        ) : null
      }
      {
        nonPolicyConforming ? (
          <FilterTag label="Doesn't conform to branch policies" onClose={() => setNonPolicyConforming(undefined, 'replaceIn')} />
        ) : null
      }
    </div>
  );
};

export default AppliedFilters;
