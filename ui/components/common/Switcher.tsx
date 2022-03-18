import React from 'react';

type SwitcherProps<T extends string | number> = {
  options: {
    label: string;
    value: T;
  }[];
  onChange: (value: T) => void;
  value: T;
};

const Switcher: <T extends string | number>(props: SwitcherProps<T>) => React.ReactElement | null = ({ options, onChange, value }) => {
  if (options.length === 0) return null;

  return (
    <ul className="switcher bg-gray-200 inline-block rounded-lg overflow-hidden">
      {options.map((option, index, options) => (
        <li key={option.value} className="inline-block">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className={
            `py-1 px-5 inline-block relative
            ${index === options.length - 1 ? '' : 'border-r border-gray-300'}
            ${option.value === value ? 'bg-yellow-500 shadow-inner' : 'bg-gray-200 hover:bg-gray-300'}`
          }
          >
            <input
              type="radio"
              name="switcher"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="opacity-0 absolute left-0 w-full h-full top-0 cursor-pointer"
            />
            {option.label}
          </label>
        </li>
      ))}
    </ul>
  );
};

export default Switcher;
