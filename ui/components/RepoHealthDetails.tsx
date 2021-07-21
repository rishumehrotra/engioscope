import React from 'react';
import { ChildIndicator } from '../../shared/types';
import Metric from './Metric';

type RepoHealthDetailsProps = {
  indicators: ChildIndicator[];
  gridCols: number;
}

const RepoHealthDetails: React.FC<RepoHealthDetailsProps> = ({ indicators, gridCols }) => (indicators?.length ? (
  <div className={`grid ${gridCols === 5 ? 'grid-cols-5' : 'grid-cols-6'} gap-4 p-6 py-6 rounded-lg bg-gray-100`}>
    {
      indicators.map(({
        value, name, tooltip, additionalValue
      }, index) => (
        <Metric
          // eslint-disable-next-line react/no-array-index-key
          key={`${name}-${index}`}
          name={name}
          value={value}
          additionalValue={additionalValue}
          tooltip={tooltip}
        />
      ))
    }
  </div>
) : null);

export default RepoHealthDetails;
