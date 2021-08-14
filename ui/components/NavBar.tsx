import React, { useCallback, useMemo } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useProjectDetails } from '../hooks/project-details-hooks';
import usePageName from '../hooks/use-page-name';
import type { Tab } from '../types';

type NavItem = {
  key: Tab;
  name?: string;
};

const NavBar: React.FC = () => {
  const history = useHistory();
  const pageName = usePageName();
  const projectDetails = useProjectDetails();
  const pathParts = history.location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1] as Tab;

  const newRoute = useCallback(
    (selectedKey: string) => `${pathParts.slice(0, -1).join('/')}/${selectedKey}`,
    [pathParts]
  );

  const navItems = useMemo<NavItem[]>(() => [
    { key: 'repos', name: pageName('repos', projectDetails?.reposCount || 0) },
    { key: 'release-pipelines', name: pageName('release-pipelines', projectDetails?.releasePipelineCount || 0) },
    ...(
      projectDetails?.workItemCount
        ? [{ key: 'workitems', name: pageName('workitems', projectDetails?.workItemCount || 0) } as NavItem]
        : []
    )
  ], [pageName, projectDetails?.releasePipelineCount, projectDetails?.reposCount, projectDetails?.workItemCount]);

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
