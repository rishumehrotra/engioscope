import React from 'react';
import { num } from '../helpers';

type MetricProps = {
  name: string;
  value: number | string;
  additionalValue?: string;
  tooltip?: string;
  position?: 'first' | 'last' | 'default';
}

const Metric: React.FC<MetricProps> = ({
  name, value, additionalValue, tooltip, position = 'default'
}) => (
  <div
    style={{ outline: 'none' }}
    className={`py-4 text-gray-900 border-r-2 border-gray-100 bg-white grid grid-cols-1 text-center
    ${position === 'first' ? 'rounded-l-lg' : ''}
    ${position === 'last' ? 'rounded-r-lg border-r-0' : ''}
    `}
    title={tooltip || ''}
  >
    <div className="text-2xl font-semibold">
      {typeof value === 'number' ? num(value) : value}
    </div>
    <span className="text-black text-sm">{additionalValue || null}</span>
    <div className="tracking-wider text-gray-600 pt-2 text-xs uppercase">{name}</div>
  </div>
);

export default Metric;
