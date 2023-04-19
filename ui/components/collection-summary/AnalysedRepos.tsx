import React from 'react';
import { num } from '../../helpers/utils.js';

const AnalysedRepos: React.FC<{ active: number; total: number }> = ({
  active,
  total,
}) => {
  return (
    <div className="text-gray-600 text-xs py-1 font-normal">
      Analyzed
      <span className="font-semibold">{` ${num(active)} `}</span>
      active repositories
      {total - active > 0 ? (
        <>
          , excluded <span className="font-semibold">{` ${num(total - active)} `}</span>
          inactive repositories
        </>
      ) : null}
    </div>
  );
};

export default AnalysedRepos;
