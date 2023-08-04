import React from 'react';
import New from './New.jsx';
import Velocity from './Velocity.jsx';
import CycleTime from './CycleTime.jsx';
import ChangeLoadTime from './ChangeLeadTime.jsx';
import QueryPeriodSelector from '../QueryPeriodSelector.jsx';
import Filters from './Filters.jsx';

const OverviewGraphs2 = () => {
  return (
    <>
      <div className="sticky top-0 bg-theme-page pb-2 grid grid-flow-col justify-between items-center">
        <Filters />
        <div className="text-right">
          <QueryPeriodSelector />
        </div>
      </div>
      <New />
      <Velocity />
      <CycleTime />
      <ChangeLoadTime />
    </>
  );
};

export default OverviewGraphs2;
