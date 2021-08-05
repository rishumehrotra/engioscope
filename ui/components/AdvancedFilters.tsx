import React, { useState } from 'react';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { Filters } from './Icons';
import { repoPageUrlTypes, Tab } from '../types';
import Checkbox from './Checkbox';
import TextCheckboxCombo from './TextCheckboxCombo';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);

const RepoFilters : React.FC<{isOpen: boolean}> = ({ isOpen }) => {
  const [commitsGreaterThanZero, setCommitsGreaterThanZero] = useUrlParams<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero, setBuildsGreaterThanZero] = useUrlParams<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds, setWithFailingLastBuilds] = useUrlParams<boolean>('withFailingLastBuilds');
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useUrlParams<number>('techDebtGreaterThan');
  // const isFilterApplied = commitsGreaterThanZero || buildsGreaterThanZero ||
  // withFailingLastBuilds || (techDebtGreaterThan !== undefined);

  return isOpen ? (
    <span
      style={{ width: '406px' }}
      className={`bg-white text-base text-gray-600 grid grid-cols-2 gap-2 content-center
        mt-12 absolute top-0 right-0 z-10 px-4 py-3
        `}
    >
      <Checkbox
        value={Boolean(commitsGreaterThanZero)}
        onChange={setCommitsGreaterThanZero}
        label={<span>Has commits</span>}
      />
      <Checkbox
        value={Boolean(buildsGreaterThanZero)}
        onChange={setBuildsGreaterThanZero}
        label={<span>Has builds</span>}
      />
      <Checkbox
        value={Boolean(withFailingLastBuilds)}
        onChange={setWithFailingLastBuilds}
        label={<span>Has failing builds</span>}
      />
      <TextCheckboxCombo
        type="number"
        value={String(techDebtGreaterThan === undefined ? '' : techDebtGreaterThan)}
        onChange={value => setTechDebtGreaterThan(value === undefined ? undefined : Number(value))}
        textBoxPrefix="Tech debt &gt; "
        textBoxSuffix=" days"
      />
    </span>
  ) : null;
};

const PipelinesFilters : React.FC<{isOpen: boolean}> = ({ isOpen }) => {
  const [nonMasterReleases, setNonMasterReleases] = useUrlParams<boolean>('nonMasterReleases');
  const [notStartsWithArtifact, setNotStartsWithArtifact] = useUrlParams<boolean>('notStartsWithArtifact');
  const [stageNameExists, setStageNameExists] = useUrlParams<string>('stageNameExists');
  const [stageNameExistsNotUsed, setStageNameExistsNotUsed] = useUrlParams<string>('stageNameExistsNotUsed');

  return isOpen ? (
    <span
      style={{ width: '426px' }}
      className={`bg-white text-base text-gray-600 grid grid-cols-2 gap-2 content-center
        mt-12 absolute top-0 right-0 z-10 px-4 py-3
        `}
    >
      <Checkbox
        value={Boolean(nonMasterReleases)}
        onChange={setNonMasterReleases}
        label={<span>Non master releases</span>}
      />
      <Checkbox
        value={Boolean(notStartsWithArtifact)}
        onChange={setNotStartsWithArtifact}
        label={<span>Doesn't start with build artifact</span>}
      />
      <TextCheckboxCombo
        type="string"
        value={stageNameExists}
        onChange={setStageNameExists}
        textBoxPrefix="Stage names containing"
      />
      <TextCheckboxCombo
        type="string"
        value={stageNameExistsNotUsed}
        onChange={setStageNameExistsNotUsed}
        textBoxPrefix="Stage names containing"
        textBoxSuffix="exists, but not used"
      />
    </span>
  ) : null;
};

const AdvancedFilters : React.FC<{ type : Tab}> = ({ type }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <span className="grid items-center ml-1 relative">
      {type === 'workitems' ? null : (
        <button onClick={() => setIsOpen(!isOpen)}>
          <Filters
            className={`text-gray-500 rounded-md hover:bg-white hover:shadow ${isOpen ? 'bg-white shadow' : ''} p-2 cursor-pointer`}
            tooltip="Advanced Filters"
          />
          {/* {isFilterApplied ? <span className="rounded inline-block absolute right-2 top-2 bg-red-500 h-2 w-2" /> : null} */}
        </button>
      )}
      {type === 'repos' ? <RepoFilters isOpen={isOpen} /> : null}
      {type === 'release-pipelines' ? <PipelinesFilters isOpen={isOpen} /> : null}
    </span>
  );
};

export default AdvancedFilters;
