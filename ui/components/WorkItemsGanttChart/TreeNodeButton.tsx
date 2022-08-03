import React from 'react';
import { Minus, Plus } from '../common/Icons.js';
import type { ExpandedState } from './types.js';

type TreeNodeButtonProps = {
  expandedState: ExpandedState;
  indentation: number;
  onToggle: (e: React.MouseEvent) => void;
};

export const TreeNodeButton: React.FC<TreeNodeButtonProps> = ({ expandedState, indentation, onToggle }) => {
  if (expandedState === 'collapsed') {
    return (
      <button
        style={{ marginLeft: `${indentation * 20}px` }}
        className="inline-block w-4 h-4 mt-1 mr-2"
        onClick={onToggle}
      >
        <Plus />
      </button>
    );
  }

  if (expandedState === 'expanded') {
    return (
      <button
        style={{ marginLeft: `${indentation * 20}px` }}
        className="inline-block w-4 h-4 mt-1 mr-2"
        onClick={onToggle}
      >
        <Minus />
      </button>
    );
  }

  return (
    <span
      style={{ marginLeft: `${(indentation * 20) + 0}px` }}
      className="inline-block w-4 h-4 mt-1 mr-2"
    >
      {' '}
    </span>
  );
};
