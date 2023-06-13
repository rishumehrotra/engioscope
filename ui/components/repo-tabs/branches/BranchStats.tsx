import React from 'react';
import type { BranchDetails, BranchTypes } from '../../../../shared/types.js';
import { oneFortnightInMs } from '../../../../shared/utils.js';
import { mediumDate, num } from '../../../helpers/utils.js';
import Loading from '../../Loading.jsx';

const BranchStats: React.FC<{
  branches: BranchDetails;
  count: number | undefined;
  limit: number;
  branchType: BranchTypes;
}> = ({ branches, count, limit, branchType }) => {
  if (count === undefined) return <Loading />;
  if (count === 0) {
    return <p className="text-gray-600 italic mt-4">No results found.</p>;
  }

  return (
    <>
      <table className="table-auto text-center divide-y divide-gray-200 w-full">
        <thead>
          <tr>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider w-3/5 text-left">
              {' '}
            </th>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-center">
              Ahead by
            </th>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-center">
              Behind by
            </th>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-right">
              Last commit
            </th>
          </tr>
        </thead>
        <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
          {branches.map(branch => (
            <tr key={branch.name}>
              <td className="pl-6 py-4 whitespace-nowrap text-left">
                <a
                  href={branch.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-text"
                >
                  {branch.name}
                </a>
              </td>
              <td
                className={
                  branch.aheadCount >= 10 && branchType === 'unhealthy'
                    ? `px-6 py-4 whitespace-nowrap text-center text-red-700`
                    : `px-6 py-4 whitespace-nowrap text-center`
                }
              >
                {`${num(branch.aheadCount)} commits`}
              </td>
              <td
                className={
                  branch.behindCount >= 10 && branchType === 'unhealthy'
                    ? `px-6 py-4 whitespace-nowrap text-center text-red-700`
                    : `px-6 py-4 whitespace-nowrap text-center`
                }
              >
                {`${num(branch.behindCount)} commits`}
              </td>
              <td
                className={
                  new Date(branch.lastCommitDate).getTime() <
                    Date.now() - oneFortnightInMs && branchType === 'unhealthy'
                    ? `px-6 py-4 whitespace-nowrap text-right text-red-700`
                    : `px-6 py-4 whitespace-nowrap text-right`
                }
              >
                {mediumDate(new Date(branch.lastCommitDate))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {count > limit ? (
        <p className="text-left text-sm italic text-gray-500 mt-4">
          {`* ${num(count - limit)} branches not shown`}
        </p>
      ) : null}
    </>
  );
};

export default BranchStats;
