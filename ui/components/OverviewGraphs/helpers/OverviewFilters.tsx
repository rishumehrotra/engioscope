import React, { useMemo } from 'react';
import { MultiSelectDropdownWithLabel } from '../../common/MultiSelectDropdown';
import type { Filter } from './use-global-filters';

type FiltersProps = {
  filters: Filter[];
  selectedFilters: Filter[];
  onChange: (filters: Filter[]) => void;
};

const Filters: React.FC<FiltersProps> = ({ filters, selectedFilters, onChange }) => {
  const filtersProps = useMemo(
    () => filters
      .map(({ label, tags }) => ({
        label,
        options: tags.map(tag => ({ label: tag, value: tag })),
        value: selectedFilters.find(sf => sf.label === label)?.tags ?? [],
        onChange: (value: string[]) => onChange([
          ...selectedFilters.filter(sf => sf.label !== label),
          { label, tags: value }
        ])
      })),
    [filters, onChange, selectedFilters]
  );

  if (!filters.length) return null;

  return (
    <div
      className="sticky top-0 bg-gray-50 ml-1 px-1 py-1 z-10 rounded-b-3xl overflow-hidden opacity-90 hover:opacity-100"
      id="sticky-block"
    >
      <div className="flex gap-2 items-center mb-6 ml-5">
        {filtersProps.map(({ label, ...rest }) => (
          <MultiSelectDropdownWithLabel
            key={label}
            label={label}
            name={label}
            {...rest}
          />
        ))}
      </div>
    </div>
  );
};

export default Filters;
