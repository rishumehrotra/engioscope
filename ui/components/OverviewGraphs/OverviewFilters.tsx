import React, { useEffect } from 'react';
import type { GroupBase, MultiValue, StylesConfig } from 'react-select';
import Select from 'react-select';

const styles: StylesConfig<string, true> = {
  multiValue: base => ({ ...base, backgroundColor: 'gray' }),
  multiValueLabel: base => ({
    ...base, fontWeight: 'bold', color: 'white', paddingRight: 6
  }),
  multiValueRemove: base => ({ ...base, color: 'white' })
};

type FiltersProps = {
  filters: {
    label: string;
    tags: string[];
  }[];
  onChange: (filters: { label: string; tags: string[] }[]) => void;
};

const Filters: React.FC<FiltersProps> = ({ filters, onChange }) => {
  const [selectValue, setSelectValue] = React.useState<Record<string, MultiValue<string>>>(
    filters.reduce<Record<string, MultiValue<string>>>((acc, filter) => {
      acc[filter.label] = [];
      return acc;
    }, {})
  );

  useEffect(() => {
    onChange(
      Object.entries(selectValue)
        .map(([key, value]) => ({
          label: key,
          tags: value.map(v => (v as unknown as { value: string }).value)
        }))
    );
  }, [onChange, selectValue]);

  if (!filters.length) return null;

  return (
    <div className="flex justify-end gap-2 items-center mb-6">
      {filters.map(({ label, tags }) => (
        // eslint-disable-next-line jsx-a11y/label-has-associated-control
        <label key={label} className="w-72 block text-sm">
          <span className="text-gray-600 font-semibold">
            {label}
          </span>
          <Select
            isMulti
            isClearable
            styles={styles}
            name={label}
            value={selectValue[label]}
            onChange={value => {
              setSelectValue(s => ({ ...s, [label]: value }));
            }}
            options={
              tags.map(tag => ({ value: tag, label: tag } as unknown as GroupBase<string>))
            }
          />
        </label>
      ))}
    </div>
  );
};

export default Filters;
