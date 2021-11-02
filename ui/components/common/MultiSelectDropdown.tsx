import React from 'react';
import type { GroupBase, MultiValue, StylesConfig } from 'react-select';
import Select from 'react-select';

const styles: StylesConfig<string, true> = {
  multiValue: base => ({ ...base, backgroundColor: 'gray' }),
  multiValueLabel: base => ({
    ...base, fontWeight: 'bold', color: 'white', paddingRight: 6
  }),
  multiValueRemove: base => ({ ...base, color: 'white' })
};

type MultiSelectDropdownProps = {
  name?: string;
  value: string[];
  options: { value: string; label: string }[];
  onChange: (value: string[]) => void;
};

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  name, value, onChange, options
}) => (
  <Select
    isMulti
    isClearable
    styles={styles}
    name={name}
    value={options.filter(o => value.includes(o.value)) as unknown as MultiValue<string>}
    placeholder="All"
    onChange={x => onChange((x as unknown as { value: string }[]).map(y => y.value as unknown as string))}
    options={options as unknown as GroupBase<string>[]}
  />
);

export const MultiSelectDropdownWithLabel: React.FC<MultiSelectDropdownProps & { label: string }> = ({
  label, ...rest
}) => (
  // eslint-disable-next-line jsx-a11y/label-has-associated-control
  <label key={label} className="w-72 block text-sm">
    <span className="text-gray-600 font-semibold">
      {label}
    </span>
    <MultiSelectDropdown {...rest} />
  </label>
);

export default MultiSelectDropdown;
