import React, { useCallback, useEffect, useRef, useState } from 'react';
import { twJoin } from 'tailwind-merge';
import New from './New.jsx';
import Velocity from './Velocity.jsx';
import CycleTime from './CycleTime.jsx';
import ChangeLoadTime from './ChangeLeadTime.jsx';
import QueryPeriodSelector from '../QueryPeriodSelector.jsx';
import Filters from './Filters.jsx';
import WIPTrend from './WIPTrend.jsx';

const OverviewGraphs2 = () => {
  const filtersRef = useRef<HTMLDivElement>(null);
  const [filterRenderCount, setFilterRenderCount] = useState(0);
  const [layoutType, setLayoutType] = useState<'2-col' | 'full-width'>('2-col');

  const relayout = useCallback(() => {
    setLayoutType((filtersRef.current?.offsetHeight || 0) > 100 ? 'full-width' : '2-col');
  }, []);

  useEffect(() => {
    relayout();

    window.addEventListener('resize', relayout, false);
    return () => window.removeEventListener('resize', relayout, false);
  }, [filterRenderCount, relayout]);

  return (
    <>
      <div
        className={twJoin(
          'sticky top-0 bg-theme-page pb-6 mb-6 grid w-full',
          layoutType === '2-col'
            ? 'grid-flow-col justify-between items-center'
            : 'grid-flow-row'
        )}
      >
        <Filters ref={filtersRef} setRenderCount={setFilterRenderCount} />
        <div className="text-right">
          <QueryPeriodSelector />
        </div>
      </div>
      <New />
      <Velocity />
      <CycleTime />
      <ChangeLoadTime />
      <WIPTrend />
    </>
  );
};

export default OverviewGraphs2;
