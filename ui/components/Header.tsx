import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { shortDate } from '../helpers/utils';
import { useHeaderDetails } from '../hooks/header-hooks';
import logo from '../images/engioscope.png';

const navItems = (changeProgramName?: string) => [
  { url: '/', name: 'Projects' },
  { url: '/summary', name: changeProgramName || 'Change program' }
];

const isSelectedForPath = (pathName: string) => (url: string) => (
  (pathName.startsWith('/summary') || pathName.startsWith('/change-program'))
    ? url !== '/'
    : url === '/'
);

const Header2: React.FC = () => {
  const location = useLocation();
  const headerDetails = useHeaderDetails();
  const isSelected = useMemo(() => isSelectedForPath(location.pathname), [location.pathname]);

  return (
    <div className="bg-gray-900 px-32 pt-4 pb-16">
      <div className="inline-grid grid-flow-col items-center gap-20">
        <Link to="/">
          <img src={logo} alt="Logo" className="w-36" />
        </Link>
        <ul>
          {(headerDetails.globalSettings?.changeProgramName || headerDetails.globalSettings?.hasSummary)
            ? (
              navItems(headerDetails.globalSettings?.changeProgramName).map(({ url, name }) => (
                <li
                  key={url}
                  className="inline-block mr-4"
                >
                  <Link
                    to={url}
                    className={`
                  px-3 mr-2 h-10 rounded-md text-lg font-medium leading-4 focus:outline-none
                  transition duration-300 ease-in-out flex items-center border-2 border-transparent
                  ${isSelected(url)
                  ? 'text-gray-100 bg-slate-700'
                  : 'hover:border-slate-500 text-gray-200 cursor-pointer'}
                `}
                  >
                    {name}
                  </Link>
                </li>
              ))
            ) : null}
        </ul>
      </div>
      <div className="mt-24">
        <div className="flex align-baseline justify-between">
          <div>
            <h1 className="text-5xl font-bold text-gray-200 pr-2">{headerDetails.title}</h1>
            {headerDetails.subtitle || (
              <div className="invisible text-lg font-bold mt-2">
                Dummy
              </div>
            )}
          </div>
          <div className="text-sm text-gray-300 justify-self-end place-self-end">
            Last updated on
            <span className="font-semibold ml-1">
              {headerDetails.globalSettings?.lastUpdated
                ? shortDate(new Date(headerDetails.globalSettings.lastUpdated))
                : '...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header2;
