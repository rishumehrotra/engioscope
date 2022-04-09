import React, { useCallback } from 'react';
import { num } from '../../helpers/utils';

export type Tab = {
  title: string;
  count: number | string;
  content: () => React.ReactNode;
};

type TopLevelTabProps = {
  isSelected: boolean;
  label: string;
  count: string | number;
  onToggleSelect: () => void;
};

export const TopLevelTab: React.FC<TopLevelTabProps> = ({
  isSelected, onToggleSelect, count, label
}) => {
  const onClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleSelect();
  }, [onToggleSelect]);

  return (
    <button
      className={`pt-2 pb-4 px-6 mt-2 text-gray-900 break-words rounded-t-lg
        ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-100'}
        hover:text-gray-900 focus:text-gray-900 cursor-pointer`}
      onClick={onClick}
    >
      <div className={`text-3xl font-semibold -mb-1 ${isSelected ? 'text-black' : 'text-gray-600'} `}>
        {typeof count === 'number' ? num(count) : count}
      </div>
      <div className="uppercase text-xs tracking-wider text-gray-600 mt-2">{label}</div>
    </button>
  );
};
