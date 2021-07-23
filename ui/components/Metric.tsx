import React from 'react';
import { num } from '../helpers';

type MetricProps = {
  name: string;
  url?: string;
  value: number | string;
  additionalValue?: string;
  tooltip?: string;
}

const Metric: React.FC<MetricProps> = ({
  name, url, value, additionalValue, tooltip
}) => (
  <div
    style={{ outline: 'none' }}
    className="py-2 text-gray-900 rounded-lg hover:bg-white grid grid-cols-1 text-center"
    title={tooltip || ''}
  >
    <div className="text-2xl font-semibold">
      {url ? (
        <a
          href={url}
          target="_blank"
          onClick={e => e.stopPropagation()}
          rel="noreferrer"
        >
          {typeof value === 'number' ? num(value) : value}
        </a>
      ) : (
        value
      )}
    </div>
    <span className="text-base text-gray-600">{additionalValue || null}</span>
    <div className="tracking-wider text-gray-600 text-sm">{name}</div>
  </div>
);

export default Metric;
