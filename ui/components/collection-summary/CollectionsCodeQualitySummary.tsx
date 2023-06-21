import React from 'react';
import { byNum, byString } from 'sort-lib';
import { prop } from 'rambda';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import Loading from '../Loading.jsx';
import { num, pluralise } from '../../helpers/utils.js';
import { useTableSorter } from '../../hooks/use-table-sorter.jsx';
import AnalysedRepos from './AnalysedRepos.jsx';
import { LabelWithSparkline } from '../graphs/Sparkline.jsx';
import { decreaseIsBetter, increaseIsBetter } from '../summary-page/utils.jsx';

type CollectionCodeQualitySummary =
  RouterClient['summary']['getCollectionCodeQualitySummary'][number];

const sorters = {
  byName: byString<CollectionCodeQualitySummary>(prop('project')),
  bySonarCount: byNum<CollectionCodeQualitySummary>(x =>
    divide(x.reposWithSonarQube, x.totalActiveRepos).getOr(-1)
  ),
  bySonarPass: byNum<CollectionCodeQualitySummary>(x =>
    divide(x.sonarProjects.passedProjects, x.sonarProjects.totalProjects).getOr(-1)
  ),
  bySonarFail: byNum<CollectionCodeQualitySummary>(x =>
    divide(x.sonarProjects.failedProjects, x.sonarProjects.totalProjects).getOr(-1)
  ),
  byBranchPolicy: byNum<CollectionCodeQualitySummary>(x =>
    divide(x.branchPolicy.conforms, x.branchPolicy.total).getOr(-1)
  ),
  byHealthyBranches: byNum<CollectionCodeQualitySummary>(x =>
    divide(x.healthyBranches.healthy, x.healthyBranches.total).getOr(-1)
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
                <button {...buttonProps('bySonarCount')}>
                  <span>Sonar enabled</span>
                  {sortIcon('bySonarCount')}
                </button>
              </th>
              <th>
                <button {...buttonProps('bySonarPass')}>
                  <span>Pass</span>
                  {sortIcon('bySonarPass')}
                </button>
              </th>
              <th>
                <button {...buttonProps('bySonarFail')}>
                  <span>Fail</span>
                  {sortIcon('bySonarFail')}
                </button>
              </th>
              <th>
                <button {...buttonProps('byBranchPolicy')}>
                  <span>Branch policies</span>
                  {sortIcon('byBranchPolicy')}
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

                <td
                  className="bg-slate-100"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content={`${project.reposWithSonarQube} of ${pluralise(
                    project.totalActiveRepos,
                    'repo has',
                    'repos have'
                  )} SonarQube configured`}
                >
                  <LabelWithSparkline
                    label={divide(project.reposWithSonarQube, project.totalActiveRepos)
                      .map(toPercentage)
                      .getOr('-')}
                    data={project.weeklyReposWithSonarQubeCount.map(w => w.count)}
                    lineColor={increaseIsBetter(
                      project.weeklyReposWithSonarQubeCount.map(w => w.count)
                    )}
                  />
                </td>
                <td
                  className="bg-slate-100"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content={`${
                    project.sonarProjects.passedProjects
                  } of ${pluralise(
                    project.sonarProjects.totalProjects,
                    'sonar project has',
                    'sonar projects have'
                  )} 'pass' quality gate`}
                >
                  <LabelWithSparkline
                    label={divide(
                      project.sonarProjects.passedProjects,
                      project.sonarProjects.totalProjects
                    )
                      .map(toPercentage)
                      .getOr('-')}
                    data={project.weeklySonarProjectsCount.map(s => s.passedProjects)}
                    lineColor={increaseIsBetter(
                      project.weeklySonarProjectsCount.map(s => s.passedProjects)
                    )}
                  />
                </td>
                <td
                  className="bg-slate-100"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content={`${
                    project.sonarProjects.failedProjects
                  } of ${pluralise(
                    project.sonarProjects.totalProjects,
                    'sonar project has',
                    'sonar projects have'
                  )} 'fail' quality gate`}
                >
                  <LabelWithSparkline
                    label={divide(
                      project.sonarProjects.failedProjects,
                      project.sonarProjects.totalProjects
                    )
                      .map(toPercentage)
                      .getOr('-')}
                    data={project.weeklySonarProjectsCount.map(s => s.failedProjects)}
                    lineColor={decreaseIsBetter(
                      project.weeklySonarProjectsCount.map(s => s.failedProjects)
                    )}
                  />
                </td>

                <td
                  data-tooltip-id="react-tooltip"
                  data-tooltip-html={`${num(
                    project.branchPolicy.conforms
                  )} out of ${pluralise(
                    project.branchPolicy.total,
                    'artifact is',
                    'artifacts are'
                  )} from branches that conform<br />to the branch policy.`}
                >
                  {divide(project.branchPolicy.conforms, project.branchPolicy.total)
                    .map(toPercentage)
                    .getOr('-')}
                </td>
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
