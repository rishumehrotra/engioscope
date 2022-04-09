import React, { useCallback, useState } from 'react';
import Checkbox from './Checkbox';

type TextCheckboxComboProps = {
  value: string | undefined;
  type: 'number' | 'string';
  onChange: (value: string | undefined) => void;
  textBoxPrefix?: string;
  textBoxSuffix?: string;
  defaultText?: string;
};

const TextCheckboxCombo: React.FC<TextCheckboxComboProps> = ({
  value, onChange, textBoxPrefix, textBoxSuffix, type, defaultText
}) => {
  const [textValue, setTextValue] = useState<string | undefined>(value);

  const getNewValue = useCallback(
    (curVal: string | undefined, type: 'string' | 'number') => {
      if (curVal) return curVal;
      if (type === 'string') return '';
      return '0';
    },
    []
  );

  const onCheckboxChange = (v: boolean) => {
    if (!value && !textValue) setTextValue(defaultText || ' ');
    if (!v) onChange(undefined);
    else onChange(getNewValue(textValue, type));
  };

  return (
    <Checkbox
      value={value !== undefined}
      onChange={onCheckboxChange}
      label={(
        <span>
          {textBoxPrefix}
          <input
            type={type}
            min={0}
            className="w-12 border-b-2 text-center"
            value={textValue || value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setTextValue(e.target.value);
              onChange(e.target.value);
            }}
          />
          {textBoxSuffix}
        </span>
      )}
    />
  );
};

export default TextCheckboxCombo;
