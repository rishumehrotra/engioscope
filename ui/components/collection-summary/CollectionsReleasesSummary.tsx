import React from 'react';
import { byNum, byString } from 'sort-lib';
import { prop } from 'rambda';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import Loading from '../Loading.jsx';
import { useTableSorter } from '../../hooks/use-table-sorter.jsx';

type CollectionReleaseSummary =
  RouterClient['summary']['getCollectionReleasesSummary'][number];

const sorters = {
  byName: byString<CollectionReleaseSummary>(prop('project')),
  byMasterOnly: byNum<CollectionReleaseSummary>(x =>
    divide(x.masterOnly ?? 0, x.runCount ?? 0).getOr(0)
  ),
  byArtifacts: byNum<CollectionReleaseSummary>(x =>
    divide(x.startsWithArtifact, x.pipelineCount).getOr(0)
  ),
};

const CollectionsReleasesSummary: React.FC<{
  collectionName: string;
  opened: boolean;
}> = ({ collectionName, opened }) => {
  const collectionSummary = trpc.summary.getCollectionReleasesSummary.useQuery(
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
                <button {...buttonProps('byMasterOnly')}>
                  <span>Master-only releases</span>
                  {sortIcon('byMasterOnly')}
                </button>
              </th>
              <th>
                <button {...buttonProps('byArtifacts')}>
                  <span>Starts with artifact</span>
                  {sortIcon('byArtifacts')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {collectionSummary.data.sort(sorter).map(project => (
              <tr key={project.project}>
                <td className="left">
                  <div className="text-base font-semibold">
                    <a href={`/${collectionName}/${project.project}/release-pipelines`}>
                      {project.project}
                    </a>
                  </div>
                </td>

                <td>
                  {divide(project.masterOnly, project.runCount)
                    .map(toPercentage)
                    .getOr('-')}
                </td>
                <td>
                  {divide(project.startsWithArtifact, project.pipelineCount)
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

export default CollectionsReleasesSummary;
