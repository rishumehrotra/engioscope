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

  const ref = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const elem = ref.current;
    if (!elem) return;

    const observer = new IntersectionObserver(
      ([e]) => setIsSticky(e.intersectionRatio < 1),
      { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
    );

    observer.observe(elem);

    return () => observer.unobserve(elem);
  });

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
        ref={ref}
        className={twJoin(
          'sticky top-0 bg-theme-page pb-4 pt-2 mb-6 grid px-32',
          isSticky ? 'shadow' : '',
          layoutType === '2-col'
            ? 'grid-flow-col justify-between items-center'
            : 'grid-flow-row'
        )}
        style={{
          marginLeft: 'calc(50% - 50vw)',
          marginRight: 'calc(50% - 50vw)',
        }}
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
