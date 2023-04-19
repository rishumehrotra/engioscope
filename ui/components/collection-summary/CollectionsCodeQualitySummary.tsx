import React from 'react';
import { byNum, byString } from 'sort-lib';
import { prop } from 'rambda';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import Loading from '../Loading.jsx';
import { num } from '../../helpers/utils.js';
import type { Sorter } from '../../hooks/useTableSorter.jsx';
import { useTableSorter } from '../../hooks/useTableSorter.jsx';

const sorters: Sorter<
  RouterClient['summary']['getCollectionCodeQualitySummary'][number]
> = {
  byName: byString(prop('project')),
  byBranches: byNum(x => x.healthyBranches.total),
  byHealthyBranches: byNum(x =>
    divide(x.healthyBranches.healthy, x.healthyBranches.total).getOr(0)
  ),
};

const CollectionsCodeQualitySummary: React.FC<{
  collectionName: string;
  opened: boolean;
}> = ({ collectionName, opened }) => {
  const collectionSummary = trpc.summary.getCollectionCodeQualitySummary.useQuery(
    { collectionName },
    { enabled: opened }
  );

  const { buttonProps, sortIcon, sorter } = useTableSorter(sorters, 'byName');

  if (!collectionSummary.data) {
    return (
      <div className="py-2">
        <Loading />
      </div>
    );
  }

  return (
    <div className="py-2">
      {collectionSummary.data.length === 0 ? (
        <div>No Projects In This Collection</div>
      ) : (
        <table className="summary-table">
          <thead>
            <tr>
              <th className="left">
                <button {...buttonProps('byName')}>{sortIcon('byName')} Project</button>
              </th>
              <th>
                <button {...buttonProps('byBranches')}>
                  {sortIcon('byBranches')} Branches
                </button>
              </th>
              <th>
                <button {...buttonProps('byHealthyBranches')}>
                  {sortIcon('byHealthyBranches')} Healthy branches
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {collectionSummary.data.sort(sorter).map(project => (
              <tr key={project.project}>
                <td className="left">
                  <a href={`/${collectionName}/${project.project}/repos`}>
                    <div className="text-base font-semibold">{project.project}</div>
                    <div className="text-gray-600 text-xs py-1">
                      Analyzed
                      <span className="font-semibold">
                        {` ${project.totalActiveRepos} `}
                      </span>
                      active repositories, excluded{' '}
                      <span className="font-semibold">
                        {` ${project.totalRepos - project.totalActiveRepos || 0} `}
                      </span>
                      inactive repositories
                    </div>
                  </a>
                </td>

                <td>{num(project.healthyBranches.total || 0)}</td>
                <td>
                  {divide(
                    project.healthyBranches.healthy ?? 0,
                    project.healthyBranches.total ?? 0
                  )
                    .map(toPercentage)
                    .getOr('-')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CollectionsCodeQualitySummary;
