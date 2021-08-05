import React from 'react';
import { Tab } from '../types';

export type NavItem = {
  key: string;
  name?: string;
};

type NavBarProps = {
  navItems: NavItem[];
  onSelect: (selectedKey: string) => void;
  selectedTab: Tab;
}

const NavBar : React.FC<NavBarProps> = ({ navItems, onSelect, selectedTab }) => (
  <div className="grid">
    <div className="flex mr-4">
      {navItems.map(({ key, name }) => (
        <button
          key={key}
          onClick={() => {
            onSelect(key);
          }}
          className={`px-3 mr-2 lg:px-3 py-1 lg:py-2 rounded text-md lg:text-lg
            font-medium leading-4 text-gray-800 
            ${selectedTab === key ? 'bg-gray-200' : 'hover:bg-gray-300 cursor-pointer'}
            focus:outline-none transition duration-300 ease-in-out`}
        >
          {name || key}
        </button>
      ))}
    </div>
  </div>
);
export default NavBar;
