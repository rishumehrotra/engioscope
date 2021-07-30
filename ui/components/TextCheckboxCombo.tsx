import React, { useState } from 'react';
import Checkbox from './Checkbox';

type TextCheckboxComboProps = {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
};

const TextCheckboxCombo: React.FC<TextCheckboxComboProps> = ({ value, onChange }) => {
  const [techDebtGreaterThan, setTextCheckboxCombo] = useState<number | undefined>(value);

  const onCheckboxChange = (v: boolean) => {
    if (!v) onChange(undefined);
    else onChange(techDebtGreaterThan || 0);
  };

  return (
    <Checkbox
      value={value !== undefined}
      onChange={onCheckboxChange}
      label={(
        <span>
          Tech debt &gt;
          <input
            type="text"
            className="w-6 border-b-2 text-center"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setTextCheckboxCombo(Number(e.target.value));
              onChange(Number(e.target.value));
            }}
          />
          {' '}
          days
        </span>
      )}
    />
  );
};

export default TextCheckboxCombo;
