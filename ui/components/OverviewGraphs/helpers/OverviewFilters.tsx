import React, { useEffect, useMemo } from 'react';
import { MultiSelectDropdownWithLabel } from '../../common/MultiSelectDropdown';
import type { Filter } from './use-global-filters';

type FiltersProps = {
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
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

  const filtersProps = useMemo(
    () => filters
      .map(({ label, tags }) => ({
        label,
        options: tags.map(tag => ({ label: tag, value: tag })),
        value: selectValue[label],
        onChange: (value: string[]) => setSelectValue({ ...selectValue, [label]: value })
      })),
    [filters, selectValue]
  );

  if (!filters.length) return null;

  return (
    <div className="flex justify-end gap-2 items-center mb-6">
      {filtersProps.map(({
        label, options, value, onChange
      }) => (
        <MultiSelectDropdownWithLabel
          key={label}
          label={label}
          name={label}
          options={options}
          value={value}
          onChange={onChange}
        />
      ))}
    </div>
  );
};

export default Filters;
