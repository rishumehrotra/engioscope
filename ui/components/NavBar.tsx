import React, { useCallback, useMemo } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useProjectDetails } from '../hooks/project-details-hooks';
import type { Tab } from '../types';

type NavItem = {
  key: Tab;
  name?: string;
};

const NavBar: React.FC = () => {
  const history = useHistory();
  const projectDetails = useProjectDetails();
  const pathParts = history.location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1] as Tab;

  const newRoute = useCallback(
    (selectedKey: string) => `${pathParts.slice(0, -1).join('/')}/${selectedKey}`,
    [pathParts]
  );

  const navItems = useMemo<NavItem[]>(() => [
    { key: 'repos', name: 'Repos' },
    { key: 'release-pipelines', name: 'Release pipelines' },
    ...(
      projectDetails?.workItemCount
        ? [{ key: 'workitems', name: projectDetails.workItemLabel[1] } as NavItem]
        : []
    )
  ], [projectDetails?.workItemCount, projectDetails?.workItemLabel]);

  return (
    <div className="grid">
      <div className="flex mr-4">
        {navItems.map(({ key, name }) => (
          <Link
            key={key}
            to={() => newRoute(key)}
            className={`px-3 mr-2 lg:px-3 py-1 lg:py-2 rounded text-md lg:text-lg
            font-medium leading-4 text-gray-800 
            ${selectedTab === key ? 'bg-gray-200' : 'hover:bg-gray-300 cursor-pointer'}
            focus:outline-none transition duration-300 ease-in-out`}
          >
            {name || key}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NavBar;
