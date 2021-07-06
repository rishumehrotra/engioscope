import React from 'react';
import { ChildIndicator } from '../../shared-types';

type RepoHealthDetailsProps = {
  indicators: ChildIndicator [],
  gridNumber: number;
}

const RepoHealthDetails: React.FC<RepoHealthDetailsProps> = ({ indicators, gridNumber }) => (indicators?.length ? (
  <div className={`grid grid-cols-${gridNumber} gap-2 pb-8`}>
    {
      indicators.map(({
        value, name, tooltip, additionalValue
      }) => (
        <div
          style={{ outline: 'none' }}
          className="px-4 py-2 text-gray-900 rounded-lg hover:bg-gray-100 cursor-pointer mr-3"
          title={tooltip || ''}
          key={name}
        >
          <div className="text-3xl font-semibold flex">
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
