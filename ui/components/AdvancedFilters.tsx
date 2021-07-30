import React, { useState } from 'react';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { Filters } from './Icons';
import { repoPageUrlTypes } from '../types';
import Checkbox from './Checkbox';
import TextCheckboxCombo from './TextCheckboxCombo';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);

const RepoFilters : React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [commitsGreaterThanZero, setCommitsGreaterThanZero] = useUrlParams<boolean>('commitsGreaterThanZero');
  const [buildsGreaterThanZero, setBuildsGreaterThanZero] = useUrlParams<boolean>('buildsGreaterThanZero');
  const [withFailingLastBuilds, setWithFailingLastBuilds] = useUrlParams<boolean>('withFailingLastBuilds');
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useUrlParams<number>('techDebtGreaterThan');
  const isFilterApplied = commitsGreaterThanZero || buildsGreaterThanZero || withFailingLastBuilds || (techDebtGreaterThan !== undefined);

  return (
    <span className="grid items-center ml-1 relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        <Filters
          className={`text-gray-500 rounded-md hover:bg-white hover:shadow ${isOpen ? 'bg-white shadow' : ''} p-2 cursor-pointer`}
          tooltip="Advanced Filters"
        />
        {isFilterApplied ? <span className="rounded inline-block absolute right-2 top-2 bg-red-500 h-2 w-2" /> : null}
      </button>
      {
        isOpen ? (
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
              value={techDebtGreaterThan}
              onChange={setTechDebtGreaterThan}
            />
          </span>
        ) : null
      }
    </span>
  );
};

export default RepoFilters;
