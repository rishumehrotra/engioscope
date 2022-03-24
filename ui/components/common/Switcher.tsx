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
    <ul className="group p-1 bg-gray-100 hover:bg-gray-200 rounded-lg inline-flex">
      {options.map(option => (
        <li key={option.value}>
          <label className={
            `py-1 px-5 relative rounded-md items-center text-base font-medium inline-block
            ${option.value === value ? 'bg-white group-hover:shadow-sm' : 'group-hover:bg-gray-200'}`
          }
          >
            <input
              type="radio"
              name="switcher"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className={`opacity-0 absolute left-0 w-full h-full top-0 ${option.value === value ? '' : 'cursor-pointer'}`}
            />
            {option.label}
          </label>
        </li>
      ))}
    </ul>
  );
};

export default Switcher;
