import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';

type Option = {
  label: string;
  value: string;
};

type InlineSelectProps = {
  id?: string;
  title?: string;
  className?: string;
  onChange: (value: string) => void;
  options: Option[];
  value: string;
};

const InlineSelect = ({
  id,
  title,
  className,
  onChange,
  options,
  value,
}: InlineSelectProps) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  const setWidth = useCallback(() => {
    if (!selectRef.current) return;

    // Create a dummy select
    const dummySelect = document.createElement('select');
    dummySelect.className = className || '';
    const dummyOption = document.createElement('option');
    dummyOption.textContent =
      selectRef.current.querySelector('option:checked')?.textContent || '';
    dummySelect.append(dummyOption);

    // Append it, take measurements, remove it
    selectRef.current.parentNode?.append(dummySelect);
    const { width } = dummySelect.getBoundingClientRect();
    dummySelect.remove();

    // Set the select width to the width of the dummy select
    selectRef.current.style.width = `${width - 18}px`;
  }, [className]);

  const onSelection = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      return onChange(e.target.value);
    },
    [onChange]
  );

  useEffect(() => {
    setWidth();
  }, [setWidth]);

  return (
    <select
      title={title}
      id={id}
      ref={selectRef}
      onChange={onSelection}
      value={value}
      className={`inline-block border-transparent hover:border-transparent focus:border-transparent focus:ring-0 text-theme-highlight text-sm font-medium p-1 pr-0 m-2 ${className} `}
    >
      {options.map(({ value, label }) => (
        <option value={value} key={value}>
          {label}
        </option>
      ))}
    </select>
  );
};

export default InlineSelect;
