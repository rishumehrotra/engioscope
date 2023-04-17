import React from 'react';
import { multiply, pipe, prop } from 'rambda';
import { byNum, byString } from 'sort-lib';
import type { RouterClient } from '../helpers/trpc.js';
import { trpc } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { LabelWithSparkline } from './graphs/Sparkline.jsx';
import { increaseIsBetter } from './summary-page/utils.jsx';
import Loading from './Loading.jsx';
import { num } from '../helpers/utils.js';
import { useTableSorter } from '../hooks/useTableSorter.jsx';

type CollectionBuildsSummary =
  RouterClient['summary']['getCollectionBuildsSummary'][number];

const sorters = {
  byName: byString<CollectionBuildsSummary>(prop('project')),
  byBuilds: byNum<CollectionBuildsSummary>(pipe(prop('totalBuilds'), prop('count'))),
  bySuccessfulBuilds: byNum<CollectionBuildsSummary>(x =>
    divide(x.successfulBuilds.count, x.totalBuilds.count).getOr(0)
  ),
  byYamlPipelines: byNum<CollectionBuildsSummary>(x =>
    divide(x.pipelines.yamlCount, x.pipelines.totalCount).getOr(0)
  ),
  byCentralTemplateUsage: byNum<CollectionBuildsSummary>(
    x => x.centralTemplatePipeline.central || 0
  ),
};

const CollectionsBuildsSummary: React.FC<{
  collectionName: string;
  opened: boolean;
}> = ({ collectionName, opened }) => {
  const collectionSummary = trpc.summary.getCollectionBuildsSummary.useQuery(
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
        <div>No projects in this collection</div>
      ) : (
        <table className="summary-table">
          <thead>
            <tr>
              <th className="left">
                <button {...buttonProps('byName')}>{sortIcon('byName')} Project</button>
              </th>
              <th>
                <button {...buttonProps('byBuilds')}>
                  {sortIcon('byBuilds')} Builds
                </button>
              </th>
              <th>
                <button {...buttonProps('bySuccessfulBuilds')}>
                  {sortIcon('bySuccessfulBuilds')} Successful builds
                </button>
              </th>
              <th>
                <button {...buttonProps('byYamlPipelines')}>
                  {sortIcon('byYamlPipelines')} YAML pipelines
                </button>
              </th>
              <th>
                <button {...buttonProps('byCentralTemplateUsage')}>
                  {sortIcon('byCentralTemplateUsage')} Central template usage
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
                      <span className="text-gray-800 font-semibold">
                        {` ${project.totalActiveRepos} `}
                      </span>
                      active repositories, excluded{' '}
                      <span className="text-gray-800 font-semibold">
                        {` ${project.totalRepos - project.totalActiveRepos || 0} `}
                      </span>
                      inactive repositories
                    </div>
                  </a>
                </td>
                <td>
                  <LabelWithSparkline
                    label={num(project.totalBuilds.count)}
                    data={project.totalBuilds.byWeek.map(week => week.count)}
                    lineColor={increaseIsBetter(
                      project.totalBuilds.byWeek.map(week => week.count)
                    )}
                  />
                </td>
                <td>
                  <LabelWithSparkline
                    label={divide(
                      project.successfulBuilds.count,
                      project.totalBuilds.count
                    )
                      .map(toPercentage)
                      .getOr('-')}
                    data={project.totalBuilds.byWeek.map(build => {
                      const successfulBuildsForWeek =
                        project.successfulBuilds.byWeek.find(
                          s => s.weekIndex === build.weekIndex
                        );
                      return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                        .map(multiply(100))
                        .getOr(0);
                    })}
                    lineColor={increaseIsBetter(
                      project.totalBuilds.byWeek.map(build => {
                        const successfulBuildsForWeek =
                          project.successfulBuilds.byWeek.find(
                            s => s.weekIndex === build.weekIndex
                          );
                        return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                          .map(multiply(100))
                          .getOr(0);
                      })
                    )}
                    yAxisLabel={x => `${x}%`}
                  />
                </td>
                <td>
                  {divide(project.pipelines.yamlCount, project.pipelines.totalCount)
                    .map(toPercentage)
                    .getOr('-')}
                </td>
                <td>{project.centralTemplatePipeline.central ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CollectionsBuildsSummary;
