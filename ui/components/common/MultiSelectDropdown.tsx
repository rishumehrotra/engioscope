import React from 'react';
import type { GroupBase, MultiValue, StylesConfig } from 'react-select';
import Select from 'react-select';

const styles: StylesConfig<string, true> = {
  multiValue: base => ({ ...base, backgroundColor: 'gray' }),
  multiValueLabel: base => ({
    ...base,
    fontWeight: 'bold',
    color: 'white',
    paddingRight: 6,
  }),
  multiValueRemove: base => ({ ...base, color: 'white' }),
};

type MultiSelectDropdownProps = {
  name?: string;
  value: string[];
  options: { value: string; label: string }[];
  onChange: (value: string[]) => void;
};

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  name,
  value,
  onChange,
  options,
}) => (
  <Select
    className="react-select"
    isMulti
    isClearable
    styles={styles}
    name={name}
    value={options.filter(o => value.includes(o.value)) as unknown as MultiValue<string>}
    placeholder="All"
    onChange={x =>
      onChange(
        (x as unknown as { value: string }[]).map(y => y.value as unknown as string)
      )
    }
    options={options as unknown as GroupBase<string>[]}
  />
);

export const MultiSelectDropdownWithLabel: React.FC<
  MultiSelectDropdownProps & { label: string; className?: string }
> = ({ label, className, ...rest }) => (
  <label key={label} className={`block ${className || 'w-72 text-sm'}`}>
    <span className="text-gray-600 font-semibold">{label}</span>
    <MultiSelectDropdown {...rest} />
  </label>
);

export default MultiSelectDropdown;
