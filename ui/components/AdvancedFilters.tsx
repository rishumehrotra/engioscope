import React, { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryParam } from 'use-query-params';
import { Filters } from './common/Icons';
import type { Tab } from '../types';
import Checkbox from './common/Checkbox';
import TextCheckboxCombo from './common/TextCheckboxCombo';
import useOnClickOutside from '../hooks/on-click-outside';

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
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1] as Tab;
  const ref = useRef(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  useOnClickOutside(ref, () => setIsOpen(false));

  return (
    <span className="grid items-center relative">
      {selectedTab === 'workitems' ? null : (
        <button onClick={() => setIsOpen(!isOpen)}>
          <Filters
            className={`text-gray-500 rounded-md border-gray-800 hover:bg-white hover:border-gray-400 hover:shadow
            ${isOpen ? 'bg-white shadow' : ''} p-2 cursor-pointer mr-6`}
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
