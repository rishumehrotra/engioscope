import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { Search, Users } from 'react-feather';
import usePageName from '../hooks/use-page-name.js';
import useQueryParam, {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
} from '../hooks/use-query-param.js';
import type { Tab } from '../types.js';
import { Close } from './common/Icons.js';

const FilterTag: React.FC<{ label: ReactNode; onClose: () => void }> = ({
  label,
  onClose,
}) => (
  <span className="ml-1 py-1 pl-3 pr-2 rounded-md bg-theme-tag flex items-center gap-2">
    <span className="flex items-center gap-2">{label}</span>
    <button onClick={onClose}>
      <Close />
    </button>
  </span>
);

const AppliedFilters: React.FC<{ count?: number; type: Tab }> = ({
  count,
  type = 'repos',
}) => {
  const pageName = usePageName();

  const [search, setSearch] = useQueryParam('search', asString);
  const [teams, setTeams] = useQueryParam('teams', asStringArray);

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
    teams ||
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

  const filtersToRender: {
    renderIf: boolean;
    key: string;
    label: ReactNode;
    clearUsing: (x: undefined, y: boolean) => void;
  }[] = useMemo(
    () =>
      [
        {
          renderIf: Boolean(search),
          label: (
            <>
              <Search size={20} />
              <span className="font-semibold">{search}</span>
            </>
          ),
          key: 'search',
          clearUsing: setSearch,
        },
        {
          renderIf: Boolean(teams),
          label: (
            <>
              <Users size={20} />
              <span className="font-semibold">{teams?.join(',')}</span>
            </>
          ),
          key: 'teams',
          clearUsing: setTeams,
        },
        {
          renderIf: Boolean(commitsGreaterThanZero),
          label: 'Has commits',
          key: 'Has commits',
          clearUsing: setCommitsGreaterThanZero,
        },
        {
          renderIf: Boolean(buildsGreaterThanZero),
          label: 'Has builds',
          key: 'Has builds',
          clearUsing: setBuildsGreaterThanZero,
        },
        {
          renderIf: Boolean(withFailingLastBuilds),
          label: 'Has failing builds',
          key: 'Has failing builds',
          clearUsing: setWithFailingLastBuilds,
        },
        {
          renderIf: Boolean(techDebtGreaterThan),
          label: `Tech debt > ${techDebtGreaterThan}`,
          key: `Tech debt > ${techDebtGreaterThan}`,
          clearUsing: setTechDebtGreaterThan,
        },
        {
          renderIf: Boolean(selectedGroupLabels),
          label: `Group: ${selectedGroupLabels}`,
          key: `Group: ${selectedGroupLabels}`,
          clearUsing: setSelectedGroupLabels,
        },
        {
          renderIf: Boolean(nonMasterReleases),
          label: 'Non-master releases',
          key: 'Non-master releases',
          clearUsing: setNonMasterReleases,
        },
        {
          renderIf: Boolean(notStartsWithArtifact),
          label: 'No starting artifact',
          key: 'No starting artifact',
          clearUsing: setNotStartsWithArtifact,
        },
        {
          renderIf: Boolean(stageNameExists),
          label: `Has stage: ${stageNameExists}`,
          key: `Has stage: ${stageNameExists}`,
          clearUsing: setStageNameExists,
        },
        {
          renderIf: Boolean(stageNameExistsNotUsed),
          label: `Unused stage: ${stageNameExistsNotUsed}`,
          key: `Unused stage: ${stageNameExistsNotUsed}`,
          clearUsing: setStageNameExistsNotUsed,
        },
        {
          renderIf: Boolean(nonPolicyConforming),
          label: "Doesn't conform to branch policies",
          key: "Doesn't conform to branch policies",
          clearUsing: setNonPolicyConforming,
        },
      ].filter(x => x.renderIf),
    [
      buildsGreaterThanZero,
      commitsGreaterThanZero,
      nonMasterReleases,
      nonPolicyConforming,
      notStartsWithArtifact,
      search,
      selectedGroupLabels,
      setBuildsGreaterThanZero,
      setCommitsGreaterThanZero,
      setNonMasterReleases,
      setNonPolicyConforming,
      setNotStartsWithArtifact,
      setSearch,
      setSelectedGroupLabels,
      setStageNameExists,
      setStageNameExistsNotUsed,
      setTeams,
      setTechDebtGreaterThan,
      setWithFailingLastBuilds,
      stageNameExists,
      stageNameExistsNotUsed,
      teams,
      techDebtGreaterThan,
      withFailingLastBuilds,
    ]
  );

  return (
    <>
      {isFilterApplied && (
        <div className="w-auto flex flex-wrap gap-2 items-center text-gray-800 mt-6 mb-6 ml-1">
          <span>Filters applied</span>
          {filtersToRender.map(f => (
            <FilterTag
              key={f.key}
              label={f.label}
              onClose={() => f.clearUsing(undefined, true)}
            />
          ))}
        </div>
      )}
      {count !== 0 && (
        <div className="mb-6 ml-1">
          Showing <strong>{count ?? '...'}</strong>{' '}
          {pageName(type, count ?? 3).toLowerCase()}
        </div>
      )}
    </>
  );
};

export default AppliedFilters;
