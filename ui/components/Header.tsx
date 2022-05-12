import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { shortDate } from '../helpers/utils';
import logo from '../images/engioscope.png';

type HeaderProps = {
  lastUpdated?: Date | null;
  title: string;
  subtitle?: () => React.ReactNode;
};

const navItems = [
  { url: '/', name: 'Projects' },
  { url: '/summary', name: 'Change program' }
];

const isSelectedForPath = (pathName: string) => (url: string) => (
  (pathName.startsWith('/summary') || pathName.startsWith('/change-program'))
    ? url !== '/'
    : url === '/'
);

const Header: React.FC<HeaderProps> = ({ lastUpdated, title, subtitle }) => {
  const location = useLocation();
  const isSelected = useMemo(() => isSelectedForPath(location.pathname), [location.pathname]);

  return (
    <div className="bg-gray-900 px-32 pt-4 pb-16">
      <div className="inline-grid grid-flow-col items-center gap-20">
        <Link to="/">
          <img src={logo} alt="Logo" className="w-36" />
        </Link>
        <ul>
          {navItems.map(({ url, name }) => (
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
          ))}
        </ul>
      </div>
      <div className="mt-24">
        <div className={`flex align-baseline justify-between ${subtitle ? '' : 'mb-6'}`}>
          <div>
            <h1 className="text-5xl font-bold text-gray-200 pr-2">{title}</h1>
            {subtitle ? subtitle() : (
              <div className="text-lg font-semibold mt-2">
                {' '}
              </div>
            )}
          </div>
          <div className="text-sm text-gray-300 justify-self-end place-self-end">
            Last updated on
            <span className="font-semibold ml-1">
              {lastUpdated ? shortDate(lastUpdated) : '...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
