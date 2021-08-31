import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../images/engioscope.png';

type HeaderProps = {
  lastUpdated?: string | null;
  title: string;
  subtitle?: () => React.ReactNode;
};

const Header: React.FC<HeaderProps> = ({ lastUpdated, title, subtitle }) => (
  <div className="bg-gray-900 px-32 pt-4 pb-24 mb-8">
    <div>
      <Link to="/">
        <img src={logo} alt="Logo" className="w-36" />
      </Link>
    </div>
    <div className="mt-12">
      <h1 className="text-5xl font-bold text-gray-200 pr-2">{title}</h1>
      <div className={`flex ${subtitle ? 'justify-between' : 'justify-end'} w-full`}>
        {subtitle ? subtitle() : null}
        <div className="text-sm text-gray-300 justify-self-end">
          Last updated on
          <span className="font-semibold ml-1">
            {lastUpdated || ''}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default Header;
