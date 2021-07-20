import React from 'react';
import { num } from '../helpers';

type MetricProps = {
  name: string;
  value: number | string;
  additionalValue: string | undefined;
  tooltip: string | undefined;
}

const Metric: React.FC<MetricProps> = ({
  name, value, additionalValue, tooltip
}) => (
  <div
    style={{ outline: 'none' }}
    className="py-2 text-gray-900 rounded-lg hover:bg-white grid grid-cols-1 text-center"
    title={tooltip || ''}
  >
    <div className="text-2xl font-semibold">
      {typeof value === 'number' ? num(value) : value}
    </div>
    <span className="text-base text-gray-600">{additionalValue || null}</span>
    <div className="tracking-wider text-gray-600 text-sm">{name}</div>
  </div>
);

export default Metric;
