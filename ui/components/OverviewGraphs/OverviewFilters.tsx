import React, { useEffect } from 'react';
import { MultiSelectDropdownWithLabel } from '../common/MultiSelectDropdown';

type FiltersProps = {
  filters: {
    label: string;
    tags: string[];
  }[];
  onChange: (filters: { label: string; tags: string[] }[]) => void;
};

const Filters: React.FC<FiltersProps> = ({ filters, onChange }) => {
  const [selectValue, setSelectValue] = React.useState(
    filters.reduce<Record<string, string[]>>((acc, filter) => {
      acc[filter.label] = [];
      return acc;
    }, {})
  );

  useEffect(() => {
    onChange(
      Object.entries(selectValue)
        .map(([key, value]) => ({
          label: key,
          tags: value
        }))
    );
  }, [onChange, selectValue]);

  if (!filters.length) return null;

  return (
    <div className="flex justify-end gap-2 items-center mb-6">
      {filters.map(({ label, tags }) => (
        <MultiSelectDropdownWithLabel
          key={label}
          label={label}
          name={label}
          options={tags.map(tag => ({ value: tag, label: tag }))}
          value={selectValue[label]}
          onChange={value => setSelectValue({ ...selectValue, [label]: value })}
        />
      ))}
    </div>
  );
};

export default Filters;
