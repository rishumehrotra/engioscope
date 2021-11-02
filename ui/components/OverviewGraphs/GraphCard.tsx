import type { ReactNode } from 'react';
import React from 'react';
import { sidebarWidth } from './LegendSidebar';

type GraphCardProps = {
  title: string;
  subtitle: string;
  noDataMessage: string;
  hasData: boolean;
  left: ReactNode;
  right: ReactNode;
};

const GraphCard: React.FC<GraphCardProps> = ({
  title, subtitle, left, right, hasData, noDataMessage
}) => (
  <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
    <h1 className="text-2xl font-semibold">
      {title}
    </h1>
    <p className="text-base text-gray-600 mb-4">
      {subtitle}
    </p>

    {hasData
      ? (
        <div className="grid gap-8 grid-flow-col">
          <div
            className="flex gap-4 justify-evenly pt-2"
            style={{ gridTemplateColumns: `1fr ${sidebarWidth}` }}
          >
            <div className="w-full">{left}</div>
            <div className="self-start">{right}</div>
          </div>
        </div>
      )
      : noDataMessage}
  </div>
);

export default GraphCard;
