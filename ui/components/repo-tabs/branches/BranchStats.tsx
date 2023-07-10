import React from 'react';
import type { BranchDetails, BranchTypes } from '../../../../shared/types.js';
import { oneFortnightInMs } from '../../../../shared/utils.js';
import { mediumDate, num } from '../../../helpers/utils.js';
import SortableTable from '../../common/SortableTable.jsx';

const BranchStats: React.FC<{
  branches?: BranchDetails;
  count: number | undefined;
  branchType: BranchTypes;
}> = ({ branches, count, branchType }) => {
  if (count === 0) {
    return <p className="text-gray-600 italic mt-4">No results found.</p>;
  }

  return (
    <SortableTable
      data={branches}
      rowKey={row => row.name}
      variant="default"
      defaultSortColumnIndex={
        branchType === 'healthy' ? 3 : branchType === 'abandoned' ? 1 : 3
      }
      columns={[
        {
          title: 'Branch',
          key: 'branch name',
          // eslint-disable-next-line react/no-unstable-nested-components
          value: branch => (
            <a href={branch.url} target="_blank" rel="noreferrer" className="link-text">
              {branch.name}
            </a>
          ),
        },
        {
          title: 'Ahead by',
          key: 'ahead by',
          // eslint-disable-next-line react/no-unstable-nested-components
          value: branch => (
            <div
              className={
                branch.aheadCount >= 10 && branchType === 'unhealthy'
                  ? 'text-red-700'
                  : ''
              }
            >
              {`${num(branch.aheadCount)} commits`}
            </div>
          ),
        },
        {
          title: 'Behind by',
          key: 'behind by',
          // eslint-disable-next-line react/no-unstable-nested-components
          value: branch => (
            <div
              className={
                branch.behindCount >= 10 && branchType === 'unhealthy'
                  ? 'text-red-700'
                  : ''
              }
            >
              {`${num(branch.behindCount)} commits`}
            </div>
          ),
        },
        {
          title: 'Last commit',
          key: 'last commit',
          // eslint-disable-next-line react/no-unstable-nested-components
          value: branch => (
            <div
              className={
                new Date(branch.lastCommitDate).getTime() <
                  Date.now() - oneFortnightInMs && branchType === 'unhealthy'
                  ? 'text-red-700'
                  : ''
              }
            >
              {mediumDate(new Date(branch.lastCommitDate))}
            </div>
          ),
        },
      ]}
    />
  );

  // {count > limit ? (
  //   <p className="text-left text-sm italic text-gray-500 mt-4">
  //     {`* ${num(count - limit)} branches not shown`}
  //   </p>
  // ) : null}
};

export default BranchStats;
