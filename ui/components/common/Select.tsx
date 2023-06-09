import type { ChangeEvent } from 'react';
import React from 'react';

type Option = {
  label: string;
  value: string;
};

type SelectProps = {
  className?: string;
  onChange: (event: string) => void;
  options: Option[];
  value: string;
};

const Select: React.FC<SelectProps> = ({ className, onChange, options, value }) => (
  <select
    title="Sort By"
    onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    value={value}
    className={`${className} `}
  >
    {options.map(({ value, label }) => (
      <option value={value} key={value}>
        {label}
      </option>
    ))}
  </select>
);

export default Select;
