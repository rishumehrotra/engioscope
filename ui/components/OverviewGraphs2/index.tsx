import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { twJoin } from 'tailwind-merge';
import { Settings } from 'react-feather';
import New from './New.jsx';
import Velocity from './Velocity.jsx';
import CycleTime from './CycleTime.jsx';
import ChangeLoadTime from './ChangeLeadTime.jsx';
import QueryPeriodSelector from '../QueryPeriodSelector.jsx';
import Filters from './Filters.jsx';
import WIPTrend from './WIPTrend.jsx';
import BugLeakage from './BugLeakage.jsx';
import PageSection from './PageSection.jsx';
import FlowEfficiency from './FlowEfficiency.jsx';
import { useDrawer } from '../common/Drawer.jsx';
import { ConfigDrawer } from './ConfigDrawer.jsx';
import useFeatureFlag from '../../hooks/use-feature-flag.js';

const sections: {
  heading: string;
  subheading: string;
  renderChildren: (openDrawer: () => void) => ReactNode;
}[] = [
  {
    heading: 'New work items',
    subheading: 'Work items on which work work has started',
    renderChildren: () => <New />,
  },
  {
    heading: 'Velocity',
    subheading: 'Work items completed',
    renderChildren: () => <Velocity />,
  },
  {
    heading: 'Cycle time',
    subheading: 'Time taken to complete a work item',
    renderChildren: () => <CycleTime />,
  },
  {
    heading: 'Change lead time',
    subheading: 'Time taken after development to complete a work item',
    renderChildren: openDrawer => <ChangeLoadTime openDrawer={openDrawer} />,
  },
  {
    heading: 'Work in progress trend',
    subheading: 'Trend of work items in progress',
    renderChildren: () => <WIPTrend />,
  },
  {
    heading: 'Bug leakage with root cause',
    subheading: 'Bugs leaked over the last 84 days with their root cause',
    renderChildren: openDrawer => <BugLeakage openDrawer={openDrawer} />,
  },
  {
    heading: 'Flow efficiency',
    subheading:
      'Fraction of overall time that work items spend in work centers on average',
    renderChildren: openDrawer => <FlowEfficiency openDrawer={openDrawer} />,
  },
];

const OverviewGraphs2 = () => {
  const filtersRef = useRef<HTMLDivElement>(null);
  const [filterRenderCount, setFilterRenderCount] = useState(0);
  const [layoutType, setLayoutType] = useState<'2-col' | 'full-width'>('2-col');
  const ref = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const showConfigDrawer = useFeatureFlag('config-drawer');
  const [Drawer, drawerProps, openDrawer, , closeDrawer] = useDrawer();
  const [drawerDetails, setDrawerDetails] = useState<{
    heading: ReactNode;
    children: ReactNode;
  }>({ heading: 'Loading...', children: 'Loading...' });

  const openConfig = useCallback(() => {
    setDrawerDetails({
      heading: 'Configure work items',
      children: <ConfigDrawer closeDrawer={closeDrawer} />,
    });
    openDrawer();
  }, [closeDrawer, openDrawer]);

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
          'sticky top-0 bg-theme-page pb-4 pt-2 mb-6 grid px-32 z-10',
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
      {showConfigDrawer ? (
        <div className="relative">
          <Drawer {...drawerDetails} {...drawerProps} />
          <div className="absolute right-1">
            <button onClick={() => openConfig()} name="configure">
              <div className="flex items-start">
                <Settings className="text-theme-highlight" />
                <span className="pl-1 leading-snug text-theme-highlight text-base font-medium">
                  Configure
                </span>
              </div>
            </button>
          </div>
        </div>
      ) : null}
      {sections.map(({ renderChildren, ...props }, index) => (
        <PageSection {...props} key={props.heading} isOpen={index === 0}>
          {renderChildren(openConfig)}
        </PageSection>
      ))}
    </>
  );
};

export default OverviewGraphs2;
