import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { shortDate } from '../helpers/utils.js';
import useUIConfig from '../hooks/use-ui-config.js';
import { useHeaderDetails } from '../hooks/header-hooks.js';
import logo from '../images/engioscope.png';

const navItems = (changeProgramName?: string) => [
  { url: '/', name: 'Projects' },
  { url: '/tracks', name: 'Tracks' },
  { url: '/summary', name: changeProgramName || 'Change program' },
];

const isSelectedForPath = (pathName: string) => (url: string) => {
  if (pathName.startsWith('/summary')) {
    return url.startsWith('/summary') || url.startsWith('/change-program');
  }
  if (pathName.startsWith('/change-program')) {
    return url.startsWith('/change-program') || url.startsWith('/summary');
  }
  if (pathName.startsWith('/tracks')) return url.startsWith('/tracks');
  return url === '/';
};

const Header: React.FC = () => {
  const location = useLocation();
  const headerDetails = useHeaderDetails();
  const uiConfig = useUIConfig();
  const isSelected = useMemo(
    () => isSelectedForPath(location.pathname),
    [location.pathname]
  );

  return (
    <div className="bg-gray-900 px-32 pt-4 pb-16">
      <div className="inline-grid grid-flow-col items-center gap-20">
        <Link to="/" className="outline-offset-8">
          <img src={logo} alt="Logo" className="w-36" />
        </Link>
        <ul>
          {uiConfig.changeProgramName || uiConfig.hasSummary
            ? navItems(uiConfig.changeProgramName).map(({ url, name }) => (
                <li key={url} className="inline-block mr-4">
                  <Link
                    to={url}
                    className={`px-3 mr-2 h-10 rounded-md text-lg font-medium leading-4
                  transition duration-300 ease-in-out flex items-center border-2 border-transparent
                  ${
                    isSelected(url)
                      ? 'text-gray-100 bg-slate-700'
                      : 'hover:border-slate-500 text-gray-200 cursor-pointer'
                  }
                `}
                  >
                    {name}
                  </Link>
                </li>
              ))
            : null}
        </ul>
        <span className="cursor-default text-gray-900">
          {/* eslint-disable-next-line no-undef */}
          {APP_VERSION}
        </span>
      </div>
      <div className="mt-24">
        <div className="flex align-baseline justify-between">
          <div>
            <h1 className="text-5xl font-bold text-gray-200 pr-2">
              {headerDetails.title}
            </h1>
            {headerDetails.subtitle || (
              <div className="invisible text-lg font-bold mt-2">Dummy</div>
            )}
          </div>
          <div className="text-sm text-gray-300 justify-self-end place-self-end">
            {headerDetails.lastUpdated ? (
              <>
                Last updated on
                <span className="font-semibold ml-1">
                  {shortDate(new Date(headerDetails.lastUpdated))}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
