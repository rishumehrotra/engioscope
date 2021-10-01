import React from 'react';
import { Link } from 'react-router-dom';
import { shortDate } from '../helpers/utils';
import logo from '../images/engioscope.png';

type HeaderProps = {
  lastUpdated?: Date | null;
  title: string;
  subtitle?: () => React.ReactNode;
};

const Header: React.FC<HeaderProps> = ({ lastUpdated, title, subtitle }) => (
  <div className="bg-gray-900 px-32 pt-4 pb-16">
    <div>
      <Link to="/">
        <img src={logo} alt="Logo" className="w-36" />
      </Link>
    </div>
    <div className="mt-24">
      <h1 className="text-5xl font-bold text-gray-200 pr-2">{title}</h1>
      <div className={`flex ${subtitle ? 'justify-between' : 'justify-end'} w-full`}>
        {subtitle ? subtitle() : null}
        <div className="text-sm text-gray-300 justify-self-end">
          Last updated on
          <span className="font-semibold ml-1">
            {lastUpdated ? shortDate(lastUpdated) : '...'}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default Header;
