import React from 'react';
import { Info } from './common/Icons.jsx';

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

export type StatProps = {
  title: string;
  value: string | null;
  tooltip?: string | null;
} & (
  | { graphPosition?: undefined }
  | {
      graphPosition: 'right' | 'bottom';
      graph: number[] | null;
      graphColor: string | null;
    }
);

export const Stat: React.FC<StatProps> = ({
  title,
  value,
  tooltip,
  // graphPosition,
  // graph,
  // graphColor,
}) => {
  return (
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
        {value || '...'}
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
      className={`rounded shadow-md border border-gray-200 shadow-gray-200 bg-white p-6 ${
        className || ''
      }`}
    >
      {children}
    </div>
  );
};
