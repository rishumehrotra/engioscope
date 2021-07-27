import React, { useCallback, useState } from 'react';
import { Filters } from './Icons';

type CheckboxProps = {
  value: boolean;
  label: React.ReactNode;
  id: string;
  onChange: (value: boolean) => void;
}

const Checkbox : React.FC<CheckboxProps> = ({
  value, label, id, onChange
}) => (
  <span className="text-xs flex items-start mb-1">
    <input
      id={id}
      type="checkbox"
      className="mr-1"
      checked={value}
      onChange={() => onChange(!value)}
    />
    <label htmlFor={id} className="font-medium text-gray-700">{label}</label>
  </span>
);

type TechDebtGreaterThanProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
};

const TechDebtGreaterThan: React.FC<TechDebtGreaterThanProps> = ({ id, value, onChange }) => {
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useState<string>(value);
  const onTechDebtGreaterThanChange = useCallback(
    (value: string) => {
      setTechDebtGreaterThan(value);
      onChange(value);
    },
    [onChange]
  );
  return (
    <Checkbox
      id={id}
      value={techDebtGreaterThan !== '0'}
      onChange={value => onTechDebtGreaterThanChange(value ? techDebtGreaterThan : '0')}
      label={(
        <span>
          Tech debt &gt;
          <input
            type="text"
            className="w-6 border-b-2 text-center"
            value={techDebtGreaterThan}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onTechDebtGreaterThanChange(e.target.value)}
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

  const [commitsGreaterThanZero, setCommitsGreaterThanZero] = useState<boolean>(false);
  const [buildsGreaterThanZero, setBuildsGreaterThanZero] = useState<boolean>(false);
  const [withFailingLastBuilds, setWithFailingLastBuilds] = useState<boolean>(false);
  const [techDebtGreaterThan, setTechDebtGreaterThan] = useState<string>('0');

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
              id="commitsGreaterThanZero"
              value={commitsGreaterThanZero}
              onChange={setCommitsGreaterThanZero}
              label={<span>No. of commits &gt; 0</span>}
            />
            <Checkbox
              id="buildsGreaterThanZero"
              value={buildsGreaterThanZero}
              onChange={setBuildsGreaterThanZero}
              label={<span>No. of builds &gt; 0</span>}
            />
            <Checkbox
              id="withFailingLastBuilds"
              value={withFailingLastBuilds}
              onChange={setWithFailingLastBuilds}
              label={<span>With failing last builds</span>}
            />
            <TechDebtGreaterThan
              id="testCoverageMoreThanDays"
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
