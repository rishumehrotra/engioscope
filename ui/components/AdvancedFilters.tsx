import React, { useCallback, useState } from 'react';
import useUrlParams from '../hooks/useUrlParams';
import { Filters } from './Icons';
import { generateId } from '../helpers';

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
    <span className="text-xs flex items-start mb-1">
      <input
        id={id}
        type="checkbox"
        className="mr-1 cursor-pointer"
        checked={value}
        onChange={() => onChange(!value)}
        disabled={disabled}
      />
      <label htmlFor={id} className="font-medium text-gray-700 cursor-pointer">{label}</label>
    </span>
  );
};

type TechDebtGreaterThanProps = {
  value: number;
  onChange: (value: number) => void;
};

const TechDebtGreaterThan: React.FC<TechDebtGreaterThanProps> = ({ value, onChange }) => {
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useState<number>(value);
  const onTechDebtGreaterThanChange = useCallback(
    (value: number) => {
      setTechDebtGreaterThan(value);
      onChange(value);
    },
    [onChange]
  );
  return (
    <Checkbox
      value={techDebtGreaterThan !== 0}
      onChange={value => onTechDebtGreaterThanChange(value ? techDebtGreaterThan : 0)}
      disabled={value === 0}
      label={(
        <span>
          Tech debt &gt;
          <input
            type="text"
            className="w-6 border-b-2 text-center"
            value={techDebtGreaterThan}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onTechDebtGreaterThanChange(Number(e.target.value))}
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

  const [commitsGreaterThanZero, setCommitsGreaterThanZero] = useUrlParams<boolean>('commitsGreaterThanZero', false);
  const [buildsGreaterThanZero, setBuildsGreaterThanZero] = useUrlParams<boolean>('buildsGreaterThanZero', false);
  const [withFailingLastBuilds, setWithFailingLastBuilds] = useUrlParams<boolean>('withFailingLastBuilds', false);
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useUrlParams<number>('techDebtGreaterThan', 0);

  return (
    <span className="grid items-center ml-1">
      <button onClick={() => setIsOpen(!isOpen)}>
        <Filters
          className={`text-gray-500 rounded-md hover:bg-white ${isOpen ? 'bg-white' : ''} p-2 cursor-pointer`}
          tooltip="Advanced Filters"
        />
      </button>
      {
        isOpen ? (
          <span className="bg-white text-base text-gray-600 grid grid-cols-2 gap-2 content-center
          mt-12 -ml-72 absolute z-10 p-2 rounded-md"
          >
            <Checkbox
              value={Boolean(commitsGreaterThanZero)}
              onChange={setCommitsGreaterThanZero}
              label={<span>No. of commits &gt; 0</span>}
            />
            <Checkbox
              value={Boolean(buildsGreaterThanZero)}
              onChange={setBuildsGreaterThanZero}
              label={<span>No. of builds &gt; 0</span>}
            />
            <Checkbox
              value={Boolean(withFailingLastBuilds)}
              onChange={setWithFailingLastBuilds}
              label={<span>With failing last builds</span>}
            />
            <TechDebtGreaterThan
              value={Number(techDebtGreaterThan)}
              onChange={setTechDebtGreaterThan}
            />
          </span>
        ) : null
      }
    </span>
  );
};

export default AdvancedFilters;
