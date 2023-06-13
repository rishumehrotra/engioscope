import type { ReactNode } from 'react';
import React, { Suspense, useCallback, useState, useMemo } from 'react';
import { head, last } from 'rambda';
import { ExternalLink, Info } from './common/Icons.jsx';
import type { Renderer } from './graphs/TinyAreaGraph.jsx';
import TinyAreaGraph, { pathRenderer } from './graphs/TinyAreaGraph.jsx';
import { useDrawer } from './common/Drawer.jsx';
import Loading from './Loading.jsx';

export const SummaryHeading: React.FC<{
  children?: React.ReactNode;
  tooltip?: string;
}> = ({ children, tooltip }) => {
  return (
    <h3 data-tip={tooltip} className="font-semibold mb-3">
      {children}
    </h3>
  );
};

export const SummaryStat: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div className="text-2xl font-bold">{children}</div>;
};

const colors = {
  good: {
    line: 'rgba(52, 199, 89, 1)',
    area: 'rgba(243, 251, 244, 1)',
  },
  bad: {
    line: 'rgba(243, 25, 25, 1)',
    area: 'rgba(251, 246, 255, 1)',
  },
  neutral: {
    line: '#6B7280',
    area: '#F3F4F6',
  },
};

export const increaseIsBetter = (data: number[]) => {
  const end = last(data) || 0;
  const start = head(data) || 0;

  return end - start > 0 ? colors.good : end - start === 0 ? colors.neutral : colors.bad;
};

export const decreaseIsBetter = (data: number[]) => {
  const end = last(data) || 0;
  const start = head(data) || 0;

  return end - start < 0 ? colors.good : end - start === 0 ? colors.neutral : colors.bad;
};

export type StatProps = {
  title: string;
  value: string | null;
  tooltip?: string | null;
  onClick?: {
    open: 'drawer';
    heading: string;
    body: ReactNode;
    downloadUrl?: string;
  };
} & (
  | { graphPosition?: undefined }
  | {
      graphPosition: 'right' | 'bottom';
      graph: number[] | null;
      graphColor: { line: string; area: string } | null;
      graphRenderer?: Renderer;
    }
);

export const Stat: React.FC<StatProps> = ({
  title,
  value,
  tooltip,
  onClick,
  ...graphProps
}) => {
  const [Drawer, drawerProps, openDrawer] = useDrawer();
  const [drawerDetails, setDrawerDetails] = useState<{
    heading: ReactNode;
    children: ReactNode;
    downloadUrl?: string;
  }>({ heading: 'Loading...', children: 'Loading...' });

  const onStatClick = useCallback(() => {
    if (!onClick) return;
    if (onClick.open !== 'drawer') return;
    setDrawerDetails({
      heading: onClick.heading,
      children: <Suspense fallback={<Loading />}>{onClick.body}</Suspense>,
      downloadUrl: onClick.downloadUrl,
    });
    openDrawer();
  }, [onClick, openDrawer]);

  const statMarkup = (
    <>
      <h3 className="font-semibold mb-3 flex items-center">
        {title}
        {tooltip === undefined ? null : (
          <span className="text-gray-400" data-tip={tooltip} data-html>
            <Info className="inline-block ml-1.5 w-4 h-4" />
          </span>
        )}
      </h3>
      <div
        className={`text-2xl font-bold transition-opacity ease-in-out duration-500 ${
          value === null ? 'opacity-0' : ''
        }`}
      >
        {value || '.'}
        {onClick?.open === 'drawer' ? (
          <button onClick={onStatClick}>
            <ExternalLink className="w-5 mx-2 link-text" />
          </button>
        ) : null}
      </div>
    </>
  );

  const graphMarkup = useMemo(() => {
    if (!graphProps.graphPosition) return null;
    const { graph, graphColor, graphRenderer } = graphProps;

    return (
      <TinyAreaGraph
        data={graph}
        color={graphColor}
        renderer={graphRenderer || pathRenderer}
        className="w-full h-auto self-end block"
      />
    );
  }, [graphProps]);

  const withOuter = useCallback(
    (contents: ReactNode) => {
      return (
        <>
          <Drawer {...drawerDetails} {...drawerProps} />
          {contents}
        </>
      );
    },
    [Drawer, drawerDetails, drawerProps]
  );

  if (!graphProps.graphPosition) return withOuter(statMarkup);

  if (graphProps.graphPosition === 'bottom') {
    return withOuter(
      <div className="grid grid-rows-2 gap-6">
        <div>{statMarkup}</div>
        {graphMarkup}
      </div>
    );
  }

  return withOuter(
    <>
      <Drawer {...drawerDetails} {...drawerProps} />
      <div className="grid grid-cols-2">
        <div>{statMarkup}</div>
        <div className="grid items-end">{graphMarkup}</div>
      </div>
    </>
  );
};

export const SummaryCard: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={`rounded border border-gray-200 bg-white p-6 ${className || ''}`}
      style={{ boxShadow: '0px 4px 8px rgba(30, 41, 59, 0.05)' }}
    >
      {children}
    </div>
  );
};
