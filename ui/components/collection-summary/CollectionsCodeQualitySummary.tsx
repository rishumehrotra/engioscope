import React from 'react';
import { byNum, byString } from 'sort-lib';
import { prop } from 'rambda';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import Loading from '../Loading.jsx';
import { num } from '../../helpers/utils.js';
import { useTableSorter } from '../../hooks/use-table-sorter.jsx';
import AnalysedRepos from './AnalysedRepos.jsx';

type CollectionCodeQualitySummary =
  RouterClient['summary']['getCollectionCodeQualitySummary'][number];

const sorters = {
  byName: byString<CollectionCodeQualitySummary>(prop('project')),
  byBranches: byNum<CollectionCodeQualitySummary>(x => x.healthyBranches.total),
  byHealthyBranches: byNum<CollectionCodeQualitySummary>(x =>
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
                <button {...buttonProps('byName')}>
                  <span>Project</span>
                  {sortIcon('byName')}
                </button>
              </th>
              <th>
                <button {...buttonProps('byBranches')}>
                  <span>Branches</span>
                  {sortIcon('byBranches')}
                </button>
              </th>
              <th>
                <button {...buttonProps('byHealthyBranches')}>
                  <span>Healthy branches</span>
                  {sortIcon('byHealthyBranches')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {collectionSummary.data.sort(sorter).map(project => (
              <tr key={project.project}>
                <td className="left">
                  <a href={`/${collectionName}/${project.project}/repos`}>
                    <div>{project.project}</div>
                    <AnalysedRepos
                      active={project.totalActiveRepos}
                      total={project.totalRepos}
                    />
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
