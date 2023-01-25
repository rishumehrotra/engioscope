import React from 'react';
import { Filters } from './common/Icons.js';
import Checkbox from './common/Checkbox.js';
import TextCheckboxCombo from './common/TextCheckboxCombo.js';
import { useTabs } from '../hooks/use-tabs.js';
import usePopover from '../hooks/use-popover.js';
import useQueryParam, {
  asBoolean,
  asNumber,
  asString,
} from '../hooks/use-query-param.js';

const RepoFilters: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
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

  return isOpen ? (
    <span
      style={{ width: '406px' }}
      className={`bg-white text-base text-gray-600 grid grid-cols-2 gap-2 content-center
        mt-12 absolute top-0 right-0 z-10 px-4 py-3 shadow
        `}
    >
      <Checkbox
        value={Boolean(commitsGreaterThanZero)}
        onChange={value => setCommitsGreaterThanZero(value ? true : undefined, true)}
        label={<span>Has commits</span>}
      />
      <Checkbox
        value={Boolean(buildsGreaterThanZero)}
        onChange={value => setBuildsGreaterThanZero(value ? true : undefined, true)}
        label={<span>Has builds</span>}
      />
      <Checkbox
        value={Boolean(withFailingLastBuilds)}
        onChange={value => setWithFailingLastBuilds(value ? true : undefined, true)}
        label={<span>Has failing builds</span>}
      />
      <TextCheckboxCombo
        type="number"
        value={String(techDebtGreaterThan === undefined ? '' : techDebtGreaterThan)}
        onChange={value =>
          setTechDebtGreaterThan(value === undefined ? undefined : Number(value), true)
        }
        textBoxPrefix="Tech debt &gt; "
        textBoxSuffix=" days"
      />
    </span>
  ) : null;
};

const PipelinesFilters: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
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

  return isOpen ? (
    <span
      style={{ width: '426px' }}
      className={`bg-white text-base text-gray-600 grid grid-cols-2 gap-2 content-center
        mt-12 absolute top-0 right-0 z-10 px-4 py-3 shadow
        `}
    >
      <Checkbox
        value={Boolean(nonMasterReleases)}
        onChange={value => setNonMasterReleases(value ? true : undefined, true)}
        label={<span>Non master releases</span>}
      />
      <Checkbox
        value={Boolean(notStartsWithArtifact)}
        onChange={value => setNotStartsWithArtifact(value ? true : undefined, true)}
        label={<span>Doesn't start with build artifact</span>}
      />
      <TextCheckboxCombo
        type="string"
        value={stageNameExists}
        onChange={value => setStageNameExists(value || undefined, true)}
        textBoxPrefix="Stage names containing"
      />
      <TextCheckboxCombo
        type="string"
        value={stageNameExistsNotUsed}
        onChange={value => setStageNameExistsNotUsed(value || undefined, true)}
        textBoxPrefix="Stage names containing"
        textBoxSuffix="exists, but not used"
      />
      <Checkbox
        value={Boolean(nonPolicyConforming)}
        onChange={value => setNonPolicyConforming(value ? true : undefined, true)}
        label={<span>Doesn't conform to branch policies</span>}
      />
    </span>
  ) : null;
};

const AdvancedFilters: React.FC = () => {
  const [selectedTab] = useTabs();
  const [ref, isOpen, setIsOpen] = usePopover();

  if (selectedTab === 'workitems' || selectedTab === 'devs' || selectedTab === '') {
    return null;
  }

  return (
    <span className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-full flex items-center hover:bg-white hover:shadow p-1 rounded
        border border-transparent hover:border-gray-400 cursor-pointer
        ${isOpen ? 'bg-white shadow' : ''}`}
        data-tip="Advanced filters"
      >
        <Filters className="text-gray-500 border-gray-800" />
      </button>
      <div ref={ref}>
        {selectedTab === 'repos' ? <RepoFilters isOpen={isOpen} /> : null}
        {selectedTab === 'release-pipelines' || selectedTab === 'release-pipelines2' ? (
          <PipelinesFilters isOpen={isOpen} />
        ) : null}
      </div>
    </span>
  );
};

export default AdvancedFilters;
