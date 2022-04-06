import { compose, not } from 'rambda';
import React, { useMemo } from 'react';
import {
  buildPipelines,
  isDeprecated, isYmlPipeline, newSonarSetupsByWeek, sonarCountsByWeek, totalBuilds, totalCoverage, totalTests, totalTestsByWeek
} from '../../shared/repo-utils';
import type { RepoAnalysis, UIBuildPipeline } from '../../shared/types';
import { num, exaggerateTrendLine, shortDate } from '../helpers/utils';
import Sparkline from './graphs/Sparkline';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';
import { decreaseIsBetter, increaseIsBetter } from './summary-page/utils';

const buildSuccessRate = (repos: RepoAnalysis[]) => {
  const aggregated = repos
    .flatMap(r => r.builds?.pipelines || [])
    .reduce(
      (acc, curr) => {
        acc.success += curr.success;
        acc.count += curr.count;
        return acc;
      },
      { success: 0, count: 0 }
    );

  return aggregated.count === 0
    ? '0%'
    : `${((aggregated.success * 100) / aggregated.count).toFixed(0)}%`;
};

const sonarStats = (repos: RepoAnalysis[]) => (
  repos.reduce(
    (acc, r) => ({
      ...acc,
      configured: acc.configured + ((r.codeQuality || []).length),
      ok: acc.ok + (r.codeQuality || []).filter(q => q.quality.gate === 'pass').length,
      warn: acc.warn + (r.codeQuality || []).filter(q => q.quality.gate === 'warn').length,
      error: acc.error + (r.codeQuality || []).filter(q => q.quality.gate === 'fail').length
    }),
    {
      configured: 0, ok: 0, warn: 0, error: 0
    }
  )
);

const pipelineLastUsed = (pipeline: UIBuildPipeline) => {
  if (pipeline.status.type === 'unknown') return 'Unknown';
  if (pipeline.status.type === 'succeeded') return 'Within the last month';
  if (!pipeline.status.since) return 'Unknown';
  return `${shortDate(new Date(pipeline.status.since))}, ${new Date(pipeline.status.since).getFullYear()}`;
};

const RepoSummary: React.FC<{ repos: RepoAnalysis[] }> = ({ repos }) => {
  const newSonarByWeek = useMemo(() => newSonarSetupsByWeek(repos), [repos]);
  const sonarCounts = useMemo(() => sonarCountsByWeek(repos), [repos]);

  const reposWithExclusions = useMemo(() => repos.filter(compose(not, isDeprecated)), [repos]);
  const sonar = useMemo(() => sonarStats(reposWithExclusions), [reposWithExclusions]);

  const allBuildPipelines = useMemo(() => buildPipelines(reposWithExclusions), [reposWithExclusions]);
  const ymlPipelines = useMemo(() => allBuildPipelines.filter(isYmlPipeline), [allBuildPipelines]);

  return (
    <ProjectStats note={
      repos.length - reposWithExclusions.length === 0
        ? undefined
        : (
          <>
            {'Excluded '}
            <b>{repos.length - reposWithExclusions.length}</b>
            {' deprecated repositories from analysis'}
          </>
        )
    }
    >
      <ProjectStat
        topStats={[{
          title: 'Tests',
          value: (
            <>
              {num(totalTests(reposWithExclusions))}
              <Sparkline
                data={exaggerateTrendLine(totalTestsByWeek(reposWithExclusions))}
                lineColor={increaseIsBetter(totalTestsByWeek(reposWithExclusions))}
                className="ml-2 -mb-1"
              />
            </>
          ),
          tooltip: 'Total number of tests across all matching repos'
        }]}
      />
      <ProjectStat
        topStats={[{
          title: 'Coverage',
          value: (({ total, covered }: { total: number; covered: number }) => (
            total === 0
              ? '-'
              : `${Math.round((covered * 100) / total)}%`
          ))(totalCoverage(reposWithExclusions))
        }]}
      />
      <ProjectStat
        topStats={[{
          title: 'Builds',
          value: num(totalBuilds(reposWithExclusions)),
          tooltip: 'Total number of builds across all matching repos'
        }]}
        childStats={[{
          title: 'Success',
          value: buildSuccessRate(reposWithExclusions),
          tooltip: 'Success rate across all matching repos'
        }]}
      />
      <ProjectStat
        topStats={[{
          title: 'Sonar',
          value: (
            reposWithExclusions.length
              ? (
                <>
                  {`${Math.round((reposWithExclusions.filter(r => !!r.codeQuality).length / reposWithExclusions.length) * 100)}%`}
                  <Sparkline
                    data={exaggerateTrendLine(newSonarByWeek)}
                    lineColor={increaseIsBetter(newSonarByWeek)}
                    className="ml-2 -mb-1"
                  />
                </>
              )
              : '-'
          ),
          tooltip: `${
            reposWithExclusions.filter(r => !!r.codeQuality).length
          } of ${reposWithExclusions.length} repos have SonarQube configured`
        }]}
        childStats={[
          {
            title: 'Ok',
            value: sonar.configured
              ? (
                <>
                  {`${((sonar.ok / sonar.configured) * 100).toFixed(0)}%`}
                  <Sparkline
                    data={exaggerateTrendLine(sonarCounts.pass)}
                    lineColor={increaseIsBetter(sonarCounts.pass)}
                    className="ml-2 -mb-1"
                  />
                </>
              )
              : '-',
            tooltip: `${sonar.ok} of ${sonar.configured} sonar projects have 'pass' quality gate`
          },
          {
            title: 'Warn',
            value: sonar.configured
              ? (
                <>
                  {`${((sonar.warn / sonar.configured) * 100).toFixed(0)}%`}
                  <Sparkline
                    data={exaggerateTrendLine(sonarCounts.warn)}
                    lineColor={decreaseIsBetter(sonarCounts.warn)}
                    className="ml-2 -mb-1"
                  />
                </>
              )
              : '-',
            tooltip: `${sonar.warn} of ${sonar.configured} sonar projects have 'warn' quality gate`
          },
          {
            title: 'Fail',
            value: sonar.configured
              ? (
                <>
                  {`${((sonar.error / sonar.configured) * 100).toFixed(0)}%`}
                  <Sparkline
                    data={exaggerateTrendLine(sonarCounts.fail)}
                    lineColor={decreaseIsBetter(sonarCounts.fail)}
                    className="ml-2 -mb-1"
                  />
                </>
              )
              : '-',
            tooltip: `${sonar.error} of ${sonar.configured} sonar projects have 'fail' quality gate`
          }
        ]}
      />
      <ProjectStat
        topStats={[{
          title: 'YAML pipelines',
          value: allBuildPipelines.length === 0
            ? '-'
            : `${Math.round((ymlPipelines.length * 100) / allBuildPipelines.length)}%`,
          tooltip: `${ymlPipelines.length} of ${allBuildPipelines.length} pipelines use a YAML-based configuration`
        }]}
        onClick={ymlPipelines.length === allBuildPipelines.length
          ? undefined
          : {
            open: 'modal',
            heading: 'Pipelines not using YAML-based configuration',
            subheading: `(${allBuildPipelines.length - ymlPipelines.length})`,
            body: (
              <>
                {reposWithExclusions
                  .filter(r => (
                    r.builds?.pipelines.length || 0) > 0
                    && (r.builds?.pipelines.filter(compose(not, isYmlPipeline)) || []).length > 0)
                  .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                  .map((repo, index) => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const pipelines = repo.builds!.pipelines.filter(compose(not, isYmlPipeline));

                    return (
                      <details className="mb-3" open={index === 0}>
                        <summary className="font-semibold text-lg cursor-pointer">
                          {`${repo.name} (${pipelines.length})`}
                        </summary>

                        <div className="bg-gray-100 pt-2 pb-4 px-4 rounded-lg mt-4">
                          <table className="table-auto text-center divide-y divide-gray-200 w-full">
                            <thead>
                              <tr>
                                {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                                <th className="px-6 py-3 text-xs w-2/6 font-medium text-gray-800 uppercase tracking-wider" />
                                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                                  Runs in the last 30 days
                                </th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Last used</th>
                              </tr>
                            </thead>
                            <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
                              {pipelines
                                .map(pipeline => (
                                  <tr>
                                    <td className="pl-6 py-4 whitespace-nowrap text-left">
                                      <a
                                        href={pipeline.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="link-text"
                                      >
                                        {pipeline.name}
                                      </a>
                                    </td>
                                    <td>
                                      {pipeline.status.type === 'unused' ? '-' : num(pipeline.count)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {pipelineLastUsed(pipeline)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    );
                  }) }
              </>
            )
          }}
      />
    </ProjectStats>
  );
};

export default RepoSummary;
