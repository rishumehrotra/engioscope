import React from 'react';
import { generateId } from '../../helpers/utils.js';

type CheckboxProps = {
  value: boolean;
  label: React.ReactNode;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

const Checkbox: React.FC<CheckboxProps> = ({
  value, label, onChange, disabled
}) => {
  const id = generateId();
  return (
    <span className="text-sm flex items-baseline">
      <input
        id={id}
        type="checkbox"
        className="mr-1 cursor-pointer"
        checked={value}
        onChange={() => onChange(!value)}
        disabled={disabled}
      />
      <label htmlFor={id} className="font-small text-gray-600 cursor-pointer">{label}</label>
    </span>
  );
};

export default Checkbox;
