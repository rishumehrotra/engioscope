import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useProjectDetails } from '../hooks/project-details-hooks';
import { Tab } from '../types';

type NavItem = {
  key: Tab;
  name?: string;
};

const NavBar : React.FC = () => {
  const history = useHistory();
  const projectDetails = useProjectDetails();
  console.log({ projectDetails });
  const pathParts = history.location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1] as Tab;

  const onSelect = useCallback(
    (selectedKey: string) => {
      history.push(`${pathParts.slice(0, -1).join('/')}/${selectedKey}`);
    },
    [history, pathParts]
  );

  const navItems = useMemo<NavItem[]>(() => [
    { key: 'repos', name: 'Repos' },
    { key: 'release-pipelines', name: 'Release pipelines' },
    ...(
      projectDetails?.workItemCount
        ? [{ key: 'workitems', name: 'Releases' } as NavItem]
        : []
    )
  ], [projectDetails?.workItemCount]);

  return (
    <div className="grid">
      <div className="flex mr-4">
        {navItems.map(({ key, name }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
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
};

export default NavBar;
