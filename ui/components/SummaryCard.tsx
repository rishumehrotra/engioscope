import type { ReactNode } from 'react';
import React, { Suspense, useCallback, useState, useMemo } from 'react';
import { ExternalLink, Info } from './common/Icons.jsx';
import type { Renderer } from './graphs/TinyAreaGraph.jsx';
import TinyAreaGraph, { graphConfig, pathRenderer } from './graphs/TinyAreaGraph.jsx';
import { useDrawer } from './common/Drawer.jsx';
import Loading from './Loading.jsx';

export const SummaryHeading: React.FC<{
  children?: React.ReactNode;
  tooltip?: string;
}> = ({ children, tooltip }) => {
  return (
    <h3
      data-tooltip-id="react-tooltip"
      data-tooltip-content={tooltip}
      className="font-semibold mb-3"
    >
      {children}
    </h3>
  );
};

export const SummaryStat: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div className="text-2xl font-bold">{children}</div>;
};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export type StatProps<T extends unknown> = {
  title: string;
  value: string | null;
  tooltip?: string;
  onClick?: {
    open: 'drawer';
    heading: string;
    body: ReactNode;
    enabledIf?: boolean;
    downloadUrl?: string;
  };
} & (
  | { graphPosition?: undefined }
  | {
      graphPosition: 'right' | 'bottom';
      graphData: T[] | undefined;
      graphItemToValue: (x: T) => number | undefined;
      graphColor: { line: string; area: string } | null;
      graphDataPointLabel: (x: T) => string;
      graphRenderer?: Renderer;
    }
);

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export const Stat = <T extends unknown>({
  title,
  value,
  tooltip,
  onClick,
  ...graphProps
}: StatProps<T>) => {
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

  const statHeading = useMemo(
    () => (
      <h3 className="font-semibold mb-3 flex items-center">
        {title}
        {tooltip === undefined ? null : (
          <span
            className="text-theme-icon hover:text-theme-icon-active"
            data-tooltip-id="react-tooltip"
            data-tooltip-html={tooltip || undefined}
          >
            <Info className="inline-block ml-1.5 w-4 h-4" />
          </span>
        )}
      </h3>
    ),
    [title, tooltip]
  );

  const statValue = useMemo(
    () => (
      <div
        className={`text-2xl font-bold transition-opacity ease-in-out duration-500 ${
          value === null ? 'opacity-0' : ''
        }`}
      >
        {value || '.'}
        {onClick?.open === 'drawer' && (onClick?.enabledIf ?? true) ? (
          <button onClick={onStatClick}>
            <ExternalLink className="w-5 mx-2 link-text" />
          </button>
        ) : null}
      </div>
    ),
    [onClick?.enabledIf, onClick?.open, onStatClick, value]
  );

  const graphMarkup = useMemo(() => {
    if (!graphProps.graphPosition) return null;
    const {
      graphData,
      graphColor,
      graphRenderer,
      graphPosition,
      graphDataPointLabel,
      graphItemToValue,
    } = graphProps;

    return (
      <TinyAreaGraph
        data={graphData}
        itemToValue={graphItemToValue}
        itemTooltipLabel={graphDataPointLabel}
        color={graphColor}
        renderer={graphRenderer || pathRenderer}
        graphConfig={graphPosition === 'bottom' ? graphConfig.large : graphConfig.medium}
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

  if (!graphProps.graphPosition) {
    return withOuter(
      <>
        {statHeading}
        {statValue}
      </>
    );
  }

  if (graphProps.graphPosition === 'bottom') {
    return withOuter(
      <div className="grid grid-rows-2 gap-6 h-full">
        <div>
          {statHeading}
          {statValue}
        </div>
        <div className="self-end">{graphMarkup}</div>
      </div>
    );
  }

  return withOuter(
    <div className="grid grid-cols-2">
      <div className="col-span-2">{statHeading}</div>
      {statValue}
      <div className="grid items-end">{graphMarkup}</div>
    </div>
  );
};

export const SummaryCard: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={`rounded border border-theme-seperator bg-theme-page-content p-6 ${
        className || ''
      }`}
      style={{ boxShadow: '0px 4px 8px rgba(30, 41, 59, 0.05)' }}
    >
      {children}
    </div>
  );
};
