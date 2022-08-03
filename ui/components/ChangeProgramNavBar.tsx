import type { ReactNode } from 'react';
import React from 'react';
import { useLocation } from 'react-router-dom';
import NavBar from './common/NavBar.js';

const navItems = [
  { key: 'metrics', label: 'Metrics', linkTo: '/summary' },
  { key: 'progress', label: 'Progress', linkTo: '/change-program' }
];

const ChangeProgramNavBar: React.FC<{ right: ReactNode }> = ({ right }) => {
  const location = useLocation();

  return (
    <NavBar
      navItems={navItems}
      selectedTab={navItems.find(n => n.linkTo.startsWith(location.pathname))?.key || navItems[0].key}
      right={right}
    />
  );
};

export default ChangeProgramNavBar;
