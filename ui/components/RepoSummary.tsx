import React from 'react';
import type { RepoAnalysis } from '../../shared/types';
import { num } from '../helpers/utils';
import { combinedQualityGateStatus } from './code-quality-utils';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';

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
    (acc, r) => {
      const status = combinedQualityGateStatus(r.codeQuality);

      return ({
        ...acc,
        configured: acc.configured + (r.codeQuality ? 1 : 0),
        ok: acc.ok + (status === 'pass' ? 1 : 0),
        warn: acc.warn + (status === 'warn' ? 1 : 0),
        error: acc.error + (status === 'fail' ? 1 : 0)
      });
    },
    {
      configured: 0, ok: 0, warn: 0, error: 0
    }
  )
);

const RepoSummary: React.FC<{ repos: RepoAnalysis[] }> = ({ repos }) => {
  const reposWithExclusions = repos.filter(r => !r.name.toLowerCase().endsWith('_exp'));
  const sonar = sonarStats(reposWithExclusions);

  return (
    <ProjectStats>
      <ProjectStat
        topStats={[{
          title: 'Tests',
          value: num(reposWithExclusions.reduce(
            (acc, r) => acc + (r.tests?.total || 0),
            0
          )),
          tooltip: 'Total number of tests across all matching repos'
        }]}
      />
      <ProjectStat
        topStats={[{
          title: 'Builds',
          value: num(reposWithExclusions.reduce(
            (acc, r) => acc + (r.builds?.count || 0),
            0
          )),
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
          value: reposWithExclusions.length ? `${((sonar.configured / reposWithExclusions.length) * 100).toFixed(0)}%` : '-',
          tooltip: `${sonar.configured} of ${reposWithExclusions.length} repos have SonarQube configured`
        }]}
        childStats={[
          {
            title: 'Ok',
            value: sonar.configured ? `${((sonar.ok / sonar.configured) * 100).toFixed(0)}%` : '-',
            tooltip: `${sonar.ok} of ${sonar.configured} repos with 'Ok' quality gate`
          },
          {
            title: 'Warn',
            value: sonar.configured ? `${((sonar.warn / sonar.configured) * 100).toFixed(0)}%` : '-',
            tooltip: `${sonar.warn} of ${sonar.configured} repos with 'Warn' quality gate`
          },
          {
            title: 'Fail',
            value: sonar.error ? `${((sonar.error / sonar.configured) * 100).toFixed(0)}%` : '-',
            tooltip: `${sonar.error} of ${sonar.configured} repos with 'Error' quality gate`
          }
        ]}
      />
    </ProjectStats>
  );
};

export default RepoSummary;

