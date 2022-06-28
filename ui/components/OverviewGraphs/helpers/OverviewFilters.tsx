import React, {
  useEffect, useMemo, useRef, useState
} from 'react';
import { MultiSelectDropdownWithLabel } from '../../common/MultiSelectDropdown';
import type { Filter } from './use-global-filters';

type FiltersProps = {
  filters: Filter[];
  selectedFilters: Filter[];
  onChange: (filters: Filter[]) => void;
};

const Filters: React.FC<FiltersProps> = ({ filters, selectedFilters, onChange }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const elem = ref.current;
    if (!elem) return;

    const observer = new IntersectionObserver(
      ([e]) => setIsSticky(e.intersectionRatio < 1),
      { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
    );

    observer.observe(elem);

    return () => observer.unobserve(elem);
  });

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
      className={`sticky top-0 px-32 bg-gray-50 ml-1 py-1 z-10 transition-shadow ${
        isSticky ? 'shadow-md' : ''
      } duration-200`}
      id="sticky-block"
      ref={ref}
      style={{
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)'
      }}
    >
      <div className="flex gap-2 items-center mb-2 ml-5">
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
