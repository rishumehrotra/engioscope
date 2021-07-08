import React, { ChangeEvent } from 'react';

type Option = {
  label: string;
  value: string;
}

type SelectProps = {
  className?: string;
  onChange: (event: string) => void;
  options: Option [];
  value: string;
};

const Select: React.FC<SelectProps> = ({
  className, onChange, options, value
}) => (
  <div className={`inline-block relative w-64 ${className || ''}`}>
    <select
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      value={value}
      className="block appearance-none w-full bg-white hover:border-gray-500
        px-4 py-2 pr-8 rounded shadow leading-tight text-gray-600
        focus:outline-none focus:ring focus:border-gray-200"
    >
      {options.map(({ value, label }) => <option value={value} key={value}>{label}</option>)}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
      <svg
        className="fill-current h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
      >
        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
      </svg>
    </div>
  </div>
);

export default Select;
