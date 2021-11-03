import type { ReactNode } from 'react';
import React from 'react';
import { useInView } from 'react-intersection-observer';
import { sidebarWidth } from './LegendSidebar';

type GraphCardProps = {
  title: string;
  subtitle: string;
  noDataMessage: string;
  hasData: boolean;
  left: ReactNode;
  right: ReactNode;
  renderLazily?: boolean;
};

const GraphCard: React.FC<GraphCardProps> = ({
  title, subtitle, left, right, hasData, noDataMessage, renderLazily = true
}) => {
  const [ref, inView] = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '300px'
  });
  return (
    <div
      className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow"
      style={{ pageBreakInside: 'avoid' }}
      ref={ref}
    >
      <h1 className="text-2xl font-semibold">
        {title}
      </h1>
      <p className="text-base text-gray-600 mb-4">
        {subtitle}
      </p>

      {hasData
        ? (inView || !renderLazily) && (
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
};

export default GraphCard;
