import type { ReactNode } from 'react';
import React from 'react';
import TeamsSelector from './teams-selector/TeamsSelector.jsx';
import AppliedFilters from './AppliedFilters.jsx';
import QueryPeriodSelector from './QueryPeriodSelector.jsx';

const PageTopBlock = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <TeamsSelector />
      <AppliedFilters />

      <div className="grid grid-cols-2 items-center my-6">
        <div className="ml-1">{children}</div>
        <div className="justify-self-end">
          <QueryPeriodSelector />
        </div>
      </div>
    </>
  );
};

export default PageTopBlock;
