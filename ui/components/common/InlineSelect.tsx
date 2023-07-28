import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

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
    document.body.append(dummySelect);
    const { width } = dummySelect.getBoundingClientRect();
    dummySelect.remove();

    // Set the select width to the width of the dummy select
    // selectRef.current.style.width = `${width - 25}px`;
    selectRef.current.style.width = `calc(${width}px - 10px - 0.2rem)`;
  }, [className]);

  const onSelection = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setWidth();
      return onChange(e.target.value);
    },
    [onChange, setWidth]
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
      className={twMerge(
        'inline-block border-0 ring-0 focus:ring-0 bg-transparent',
        'text-theme-highlight text-sm font-medium p-0 m-0 cursor-pointer',
        className
      )}
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
