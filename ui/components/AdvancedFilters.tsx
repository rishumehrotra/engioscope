import React, { useRef, useState } from 'react';
import { useQueryParam } from 'use-query-params';
import { Filters } from './common/Icons';
import Checkbox from './common/Checkbox';
import TextCheckboxCombo from './common/TextCheckboxCombo';
import useOnClickOutside from '../hooks/on-click-outside';
import { useTabs } from '../hooks/use-tabs';

const RepoFilters: React.FC<{isOpen: boolean}> = ({ isOpen }) => {
  const [commitsGreaterThanZero, setCommitsGreaterThanZero] = useQueryParam<boolean | undefined>('commitsGreaterThanZero');
  const [buildsGreaterThanZero, setBuildsGreaterThanZero] = useQueryParam<boolean | undefined>('buildsGreaterThanZero');
  const [withFailingLastBuilds, setWithFailingLastBuilds] = useQueryParam<boolean | undefined>('withFailingLastBuilds');
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useQueryParam<number | undefined>('techDebtGreaterThan');

  return isOpen ? (
    <span
      style={{ width: '406px' }}
      className={`bg-white text-base text-gray-600 grid grid-cols-2 gap-2 content-center
        mt-12 absolute top-0 right-0 z-10 px-4 py-3 shadow
        `}
    >
      <Checkbox
        value={Boolean(commitsGreaterThanZero)}
        onChange={value => setCommitsGreaterThanZero(value ? true : undefined, 'replaceIn')}
        label={<span>Has commits</span>}
      />
      <Checkbox
        value={Boolean(buildsGreaterThanZero)}
        onChange={value => setBuildsGreaterThanZero(value ? true : undefined, 'replaceIn')}
        label={<span>Has builds</span>}
      />
      <Checkbox
        value={Boolean(withFailingLastBuilds)}
        onChange={value => setWithFailingLastBuilds(value ? true : undefined, 'replaceIn')}
        label={<span>Has failing builds</span>}
      />
      <TextCheckboxCombo
        type="number"
        value={String(techDebtGreaterThan === undefined ? '' : techDebtGreaterThan)}
        onChange={value => setTechDebtGreaterThan(value === undefined ? undefined : Number(value), 'replaceIn')}
        textBoxPrefix="Tech debt &gt; "
        textBoxSuffix=" days"
      />
    </span>
  ) : null;
};

const PipelinesFilters: React.FC<{isOpen: boolean}> = ({ isOpen }) => {
  const [nonMasterReleases, setNonMasterReleases] = useQueryParam<boolean | undefined>('nonMasterReleases');
  const [notStartsWithArtifact, setNotStartsWithArtifact] = useQueryParam<boolean | undefined>('notStartsWithArtifact');
  const [stageNameExists, setStageNameExists] = useQueryParam<string | undefined>('stageNameExists');
  const [stageNameExistsNotUsed, setStageNameExistsNotUsed] = useQueryParam<string | undefined>('stageNameExistsNotUsed');

  return isOpen ? (
    <span
      style={{ width: '426px' }}
      className={`bg-white text-base text-gray-600 grid grid-cols-2 gap-2 content-center
        mt-12 absolute top-0 right-0 z-10 px-4 py-3 shadow
        `}
    >
      <Checkbox
        value={Boolean(nonMasterReleases)}
        onChange={value => setNonMasterReleases(value ? true : undefined, 'replaceIn')}
        label={<span>Non master releases</span>}
      />
      <Checkbox
        value={Boolean(notStartsWithArtifact)}
        onChange={value => setNotStartsWithArtifact(value ? true : undefined, 'replaceIn')}
        label={<span>Doesn't start with build artifact</span>}
      />
      <TextCheckboxCombo
        type="string"
        value={stageNameExists}
        onChange={value => setStageNameExists(value || undefined, 'replaceIn')}
        textBoxPrefix="Stage names containing"
      />
      <TextCheckboxCombo
        type="string"
        value={stageNameExistsNotUsed}
        onChange={value => setStageNameExistsNotUsed(value || undefined, 'replaceIn')}
        textBoxPrefix="Stage names containing"
        textBoxSuffix="exists, but not used"
      />
    </span>
  ) : null;
};

const AdvancedFilters: React.FC = () => {
  const [selectedTab] = useTabs();
  const ref = useRef(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  useOnClickOutside(ref, () => setIsOpen(false));

  return (
    <span className="relative">
      {selectedTab === 'workitems' ? null : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-full flex items-center
          hover:bg-white hover:shadow p-1 rounded border border-transparent hover:border-gray-400
        ${isOpen ? 'bg-white shadow' : ''}`}
        >
          <Filters
            className={`text-gray-500 border-gray-800
             cursor-pointer`}
            tooltip="Advanced Filters"
          />
        </button>
      )}
      <div ref={ref}>
        {selectedTab === 'repos' ? <RepoFilters isOpen={isOpen} /> : null}
        {selectedTab === 'release-pipelines' ? <PipelinesFilters isOpen={isOpen} /> : null}
      </div>
    </span>
  );
};

export default AdvancedFilters;
