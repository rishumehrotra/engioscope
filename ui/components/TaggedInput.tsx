import { init, trim } from 'rambda';
import React, { useCallback, useState } from 'react';
import { unique } from '../../shared/utils.js';

type TagProps = {
  tag: string;
  onDelete: () => void;
};

const Tag = ({ tag, onDelete }: TagProps) => {
  return (
    <div className="whitespace-nowrap">
      {tag}
      <button onClick={onDelete}>x</button>
    </div>
  );
};

export type TagState = {
  tags: string[];
  incomplete: string;
};

type TaggedInputProps = {
  tagCharCodes?: number[];
  onChange: (x: TagState) => void;
  value: TagState;
};

const TaggedInput = ({ tagCharCodes = [13], onChange, value }: TaggedInputProps) => {
  const [textboxValue, setTextboxValue] = useState('');
  const [isBackspaceReleased, setIsBackspaceReleased] = useState(false);

  const onFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      setTextboxValue(e.target.value);
      onChange({ tags: value.tags, incomplete: e.target.value });
    },
    [onChange, value.tags]
  );

  const onFieldKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (tagCharCodes.includes(e.keyCode)) {
        e.preventDefault();
        onChange({
          tags: unique([...value.tags.map(trim), e.currentTarget.value.trim()]).filter(
            x => x.length > 0
          ),
          incomplete: '',
        });
        setTextboxValue('');
      }

      if (
        e.key === 'Backspace' &&
        !textboxValue.length &&
        value.tags.length &&
        isBackspaceReleased
      ) {
        e.preventDefault();

        onChange({
          tags: init(value.tags),
          incomplete: value.incomplete,
        });
      }

      setIsBackspaceReleased(false);
    },
    [
      isBackspaceReleased,
      onChange,
      tagCharCodes,
      textboxValue.length,
      value.incomplete,
      value.tags,
    ]
  );

  const deleteTag = (tag: string) => {
    onChange({
      tags: value.tags.filter(t => t !== tag),
      incomplete: value.incomplete,
    });
  };

  const onKeyUp = useCallback(() => setIsBackspaceReleased(true), []);

  return (
    <div className="inline-flex">
      {value.tags.map(tag => (
        <Tag tag={tag} key={tag} onDelete={() => deleteTag(tag)} />
      ))}
      <input
        type="text"
        onChange={onFieldChange}
        onKeyUp={onKeyUp}
        onKeyDown={onFieldKeyDown}
        value={textboxValue}
      />
    </div>
  );
};

export default TaggedInput;
