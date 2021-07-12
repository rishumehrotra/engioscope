import React from 'react';
import { ChildIndicator } from '../../shared-types';

type RepoHealthDetailsProps = {
  indicators: ChildIndicator [],
  gridCols: number;
}

const RepoHealthDetails: React.FC<RepoHealthDetailsProps> = ({ indicators, gridCols }) => (indicators?.length ? (
  <div className={`grid ${gridCols === 4 ? 'grid-cols-4' : 'grid-cols-6'} gap-4 p-6 py-6 rounded-lg bg-gray-100`}>
    {
      indicators.map(({
        value, name, tooltip, additionalValue
      }) => (
        <div
          style={{ outline: 'none' }}
          className="py-2 text-gray-900 rounded-lg hover:bg-white grid grid-cols-1 text-center"
          title={tooltip || ''}
          key={name}
        >
          <div className="text-2xl font-semibold">
            {value}
            {/* <span className="text-base flex mt-4 ml-2 text-gray-600">
              <span className={`text-${getRatingColor(rating)}`}>{rating}</span>
            </span> */}
          </div>
          <span className="text-base text-gray-600">{additionalValue || null}</span>
          <div className="tracking-wider text-gray-600 text-sm">{name}</div>
        </div>
      ))
    }
  </div>
) : null);

export default RepoHealthDetails;
