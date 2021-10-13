import type { ReactNode } from 'react';
import React from 'react';

type GraphCardProps = {
  title: string;
  subtitle: string;
  left: ReactNode;
  right: ReactNode;
};

const GraphCard: React.FC<GraphCardProps> = ({
  title, subtitle, left, right
}) => (
  <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
    <h1 className="text-2xl font-semibold">
      {title}
    </h1>
    <p className="text-base text-gray-600 mb-4">
      {subtitle}
    </p>

    <div className="grid gap-8 grid-flow-col">
      <div className="flex gap-4 justify-evenly items-center" style={{ gridTemplateColumns: '1fr 317px' }}>
        <div className="w-full">{left}</div>
        <div>{right}</div>
      </div>
    </div>
  </div>
);

export default GraphCard;
