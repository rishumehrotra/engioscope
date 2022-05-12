import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

type NavItem = {
  url: string;
  name?: string;
};

const navItems: NavItem[] = [
  { url: '/summary', name: 'Metrics' },
  { url: '/change-program', name: 'Progress' }
];

const isSelectedForPath = (pathName: string) => (url: string) => pathName.startsWith(url);

const ChangeProgramNavBar: React.FC = () => {
  const location = useLocation();
  const isSelected = useMemo(() => isSelectedForPath(location.pathname), [location.pathname]);

  return (
    <div className="grid col-span-2">
      <div className="flex mr-4">
        {navItems.map(({ url, name }) => (
          <Link
            key={url}
            to={url}
            className={`nav-link ${isSelected(url) ? 'selected' : 'not-selected'}`}
          >
            {name || url}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ChangeProgramNavBar;
