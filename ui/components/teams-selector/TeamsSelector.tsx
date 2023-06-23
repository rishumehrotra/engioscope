import React from 'react';
import useDropdownMenu from 'react-accessible-dropdown-menu-hook';
import { Copy, Edit3, Plus, Sliders, Trash2 } from 'react-feather';
import useQueryParam, { asBoolean } from '../../hooks/use-query-param.js';

const TeamsSelector = () => {
  const [isEnabled] = useQueryParam('teams', asBoolean);
  const { buttonProps, itemProps, isOpen } = useDropdownMenu(4);

  if (!isEnabled) return null;

  return (
    <div className="inline-flex items-stretch gap-3 mb-4">
      <select>
        <option>All teams</option>
      </select>
      <div className="relative inline-block">
        <button
          {...buttonProps}
          className="button bg-theme-page-content inline-block h-full px-2.5 text-theme-icon hover:text-theme-highlight"
        >
          <Sliders size={20} />
        </button>
        <div
          className={`${
            isOpen ? 'visible' : 'invisible'
          } absolute w-max bg-theme-page-content shadow-lg mt-1`}
          role="menu"
        >
          <a
            {...itemProps[0]}
            className="flex items-center gap-2 px-3 py-2 pr-8 cursor-pointer hover:bg-theme-secondary focus-visible:bg-theme-secondary"
          >
            <Plus size={20} />
            <span>Create a new team</span>
          </a>
          <a
            {...itemProps[1]}
            className="flex items-center gap-2 px-3 py-2 pr-8 cursor-pointer hover:bg-theme-secondary focus-visible:bg-theme-secondary"
          >
            <Edit3 size={20} />
            <span>Edit team</span>
          </a>
          <a
            {...itemProps[2]}
            className="flex items-center gap-2 px-3 py-2 pr-8 cursor-pointer hover:bg-theme-secondary focus-visible:bg-theme-secondary"
          >
            <Copy size={20} />
            <span>Duplicate team</span>
          </a>
          <a
            {...itemProps[3]}
            className="flex items-center gap-2 px-3 py-2 pr-8 cursor-pointer hover:bg-theme-danger hover:text-theme-danger focus-visible:bg-theme-danger focus-visible:text-theme-danger"
          >
            <Trash2 size={20} />
            <span>Delete team</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default TeamsSelector;
