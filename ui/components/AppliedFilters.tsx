import React from 'react';
import usePageName from '../hooks/use-page-name.js';
import useQueryParam, {
  asBoolean,
  asNumber,
  asString,
} from '../hooks/use-query-param.js';
import type { Tab } from '../types.js';
import { Close } from './common/Icons.js';

const FilterTag: React.FC<{ label: string; onClose: () => void }> = ({
  label,
  onClose,
}) => (
  <span className="ml-1 py-1 pl-3 pr-2 border border-gray-300 rounded-full flex bg-white text-sm">
    <span>{label}</span>
    <button onClick={onClose}>
      <Close className="ml-1" />
    </button>
  </span>
);

const AppliedFilters: React.FC<{ count?: number; type: Tab }> = ({
  count,
  type = 'repos',
}) => {
  const pageName = usePageName();

  const [search, setSearch] = useQueryParam('search', asString);

  const [commitsGreaterThanZero, setCommitsGreaterThanZero] = useQueryParam(
    'commitsGreaterThanZero',
    asBoolean
  );
  const [buildsGreaterThanZero, setBuildsGreaterThanZero] = useQueryParam(
    'buildsGreaterThanZero',
    asBoolean
  );
  const [withFailingLastBuilds, setWithFailingLastBuilds] = useQueryParam(
    'withFailingLastBuilds',
    asBoolean
  );
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useQueryParam(
    'techDebtGreaterThan',
    asNumber
  );
  const [selectedGroupLabels, setSelectedGroupLabels] = useQueryParam('group', asString);

  const [nonMasterReleases, setNonMasterReleases] = useQueryParam(
    'nonMasterReleases',
    asBoolean
  );
  const [notStartsWithArtifact, setNotStartsWithArtifact] = useQueryParam(
    'notStartsWithArtifact',
    asBoolean
  );
  const [stageNameExists, setStageNameExists] = useQueryParam(
    'stageNameExists',
    asString
  );
  const [stageNameExistsNotUsed, setStageNameExistsNotUsed] = useQueryParam(
    'stageNameExistsNotUsed',
    asString
  );
  const [nonPolicyConforming, setNonPolicyConforming] = useQueryParam(
    'nonPolicyConforming',
    asBoolean
  );

  const isFilterApplied =
    search ||
    commitsGreaterThanZero ||
    buildsGreaterThanZero ||
    withFailingLastBuilds ||
    techDebtGreaterThan !== undefined ||
    selectedGroupLabels ||
    nonMasterReleases ||
    notStartsWithArtifact ||
    stageNameExists ||
    stageNameExistsNotUsed ||
    nonPolicyConforming;
  if (!isFilterApplied) return <div />;

  return (
    <div className="w-auto flex flex-wrap items-center text-gray-800 mb-2">
      {`Showing ${count ?? '...'} ${pageName(
        type,
        count ?? 3
      ).toLowerCase()} with filters applied: `}
      {search ? (
        <FilterTag
          label={`Search: ${search}`}
          onClose={() => setSearch(undefined, true)}
        />
      ) : null}
      {commitsGreaterThanZero ? (
        <FilterTag
          label="Has commits"
          onClose={() => setCommitsGreaterThanZero(undefined, true)}
        />
      ) : null}
      {buildsGreaterThanZero ? (
        <FilterTag
          label="Has builds"
          onClose={() => setBuildsGreaterThanZero(undefined, true)}
        />
      ) : null}
      {withFailingLastBuilds ? (
        <FilterTag
          label="Has failing builds"
          onClose={() => setWithFailingLastBuilds(undefined, true)}
        />
      ) : null}
      {techDebtGreaterThan ? (
        <FilterTag
          label={`Tech debt > ${techDebtGreaterThan}`}
          onClose={() => setTechDebtGreaterThan(undefined, true)}
        />
      ) : null}
      {selectedGroupLabels ? (
        <FilterTag
          label={`Group: ${selectedGroupLabels}`}
          onClose={() => setSelectedGroupLabels(undefined, true)}
        />
      ) : null}

      {nonMasterReleases ? (
        <FilterTag
          label="Non-master releases"
          onClose={() => setNonMasterReleases(undefined, true)}
        />
      ) : null}
      {notStartsWithArtifact ? (
        <FilterTag
          label="No starting artifact"
          onClose={() => setNotStartsWithArtifact(undefined, true)}
        />
      ) : null}
      {stageNameExists ? (
        <FilterTag
          label={`Has stage: ${stageNameExists}`}
          onClose={() => setStageNameExists(undefined, true)}
        />
      ) : null}
      {stageNameExistsNotUsed ? (
        <FilterTag
          label={`Unused stage: ${stageNameExistsNotUsed}`}
          onClose={() => setStageNameExistsNotUsed(undefined, true)}
        />
      ) : null}
      {nonPolicyConforming ? (
        <FilterTag
          label="Doesn't conform to branch policies"
          onClose={() => setNonPolicyConforming(undefined, true)}
        />
      ) : null}
    </div>
  );
};

export default AppliedFilters;
