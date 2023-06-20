import { init, trim } from 'rambda';
import React, { useCallback, useRef, useState } from 'react';
import { X } from 'react-feather';
import { useHotkeys } from 'react-hotkeys-hook';
import { unique } from '../../shared/utils.js';

type TagProps = {
  tag: string;
  onDelete: () => void;
};

const Tag = ({ tag, onDelete }: TagProps) => {
  return (
    <div className="whitespace-nowrap inline-flex items-center bg-theme-tag py-1 px-2 gap-1">
      <span>{tag}</span>
      <button onClick={onDelete}>
        <X size={16} />
      </button>
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
  placeholder?: string;
};

const TaggedInput = ({
  tagCharCodes = [13, 188], // Enter, comma
  onChange,
  value,
  placeholder,
}: TaggedInputProps) => {
  // const [textboxValue, setTextboxValue] = useState(value.incomplete);
  const [isBackspaceReleased, setIsBackspaceReleased] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useHotkeys(
    '/',
    () => {
      inputRef.current?.focus();
    },
    { preventDefault: true }
  );

  const onFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      // setTextboxValue(e.target.value);
      onChange({ tags: value.tags, incomplete: e.currentTarget.value });
    },
    [onChange, value.tags]
  );

  const onFieldKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (tagCharCodes.includes(e.keyCode)) {
        e.preventDefault();
        if (e.currentTarget.value.trim() !== '') {
          onChange({
            tags: unique([...value.tags.map(trim), e.currentTarget.value.trim()]),
            incomplete: '',
          });
        }
      }

      if (
        e.key === 'Backspace' &&
        !e.currentTarget.value.length &&
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
    [isBackspaceReleased, onChange, tagCharCodes, value.incomplete, value.tags]
  );

  const deleteTag = (tag: string) => {
    onChange({
      tags: value.tags.filter(t => t !== tag),
      incomplete: value.incomplete,
    });
  };

  const onKeyUp = useCallback(() => setIsBackspaceReleased(true), []);

  return (
    <div className="tagged-input inline-flex items-center gap-1 pl-1">
      {value.tags.map(tag => (
        <Tag
          tag={tag}
          key={tag}
          onDelete={() => {
            deleteTag(tag);
            inputRef.current?.focus();
          }}
        />
      ))}
      <input
        type="text"
        ref={inputRef}
        onChange={onFieldChange}
        onKeyUp={onKeyUp}
        onKeyDown={onFieldKeyDown}
        value={value.incomplete}
        placeholder={value.tags.length === 0 ? placeholder : ''}
      />
    </div>
  );
};

export default TaggedInput;
