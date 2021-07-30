import React, { useState } from 'react';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { Filters } from './Icons';
import { generateId } from '../helpers';
import { repoPageUrlTypes } from '../types';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);

type CheckboxProps = {
  value: boolean;
  label: React.ReactNode;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const Checkbox : React.FC<CheckboxProps> = ({
  value, label, onChange, disabled
}) => {
  const id = generateId();
  return (
    <span className="text-sm flex items-center">
      <input
        id={id}
        type="checkbox"
        className="mr-1 cursor-pointer"
        checked={value}
        onChange={() => onChange(!value)}
        disabled={disabled}
      />
      <label htmlFor={id} className="font-small text-gray-600 cursor-pointer">{label}</label>
    </span>
  );
};

type TechDebtGreaterThanProps = {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
};

const TechDebtGreaterThan: React.FC<TechDebtGreaterThanProps> = ({ value, onChange }) => {
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useState<number | undefined>(value);

  const onCheckboxChange = (v: boolean) => {
    if (!v) onChange(undefined);
    else onChange(techDebtGreaterThan || 0);
  };

  return (
    <Checkbox
      value={value !== undefined}
      onChange={onCheckboxChange}
      label={(
        <span>
          Tech debt &gt;
          <input
            type="text"
            className="w-6 border-b-2 text-center"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setTechDebtGreaterThan(Number(e.target.value));
              onChange(Number(e.target.value));
            }}
          />
          {' '}
          days
        </span>
      )}
    />
  );
};

const AdvancedFilters : React.FC = () => {
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
            <TechDebtGreaterThan
              value={techDebtGreaterThan}
              onChange={setTechDebtGreaterThan}
            />
          </span>
        ) : null
      }
    </span>
  );
};

export default AdvancedFilters;
