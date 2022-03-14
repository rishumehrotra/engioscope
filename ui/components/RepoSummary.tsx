import { compose, not } from 'rambda';
import React from 'react';
import { isDeprecated, totalBuilds, totalTests } from '../../shared/repo-utils';
import type { RepoAnalysis } from '../../shared/types';
import { num } from '../helpers/utils';
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

const RepoSummary: React.FC<{ repos: RepoAnalysis[] }> = ({ repos }) => {
  const reposWithExclusions = repos.filter(compose(not, isDeprecated));
  const sonar = sonarStats(reposWithExclusions);

  return (
    <ProjectStats note={
      repos.length - reposWithExclusions.length === 0
        ? undefined
        : `Excluded ${repos.length - reposWithExclusions.length} deprecated repositories from analysis`
    }
    >
      <ProjectStat
        topStats={[{
          title: 'Tests',
          value: num(totalTests(reposWithExclusions)),
          tooltip: 'Total number of tests across all matching repos'
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
          value: reposWithExclusions.length
            ? `${Math.round((reposWithExclusions.filter(r => !!r.codeQuality).length / reposWithExclusions.length) * 100)}%`
            : '-',
          tooltip: `${
            reposWithExclusions.filter(r => !!r.codeQuality).length
          } of ${reposWithExclusions.length} repos have SonarQube configured`
        }]}
        childStats={[
          {
            title: 'Ok',
            value: sonar.configured ? `${((sonar.ok / sonar.configured) * 100).toFixed(0)}%` : '-',
            tooltip: `${sonar.ok} of ${sonar.configured} sonar projects have 'pass' quality gate`
          },
          {
            title: 'Warn',
            value: sonar.configured ? `${((sonar.warn / sonar.configured) * 100).toFixed(0)}%` : '-',
            tooltip: `${sonar.warn} of ${sonar.configured} sonar projects have 'warn' quality gate`
          },
          {
            title: 'Fail',
            value: sonar.error ? `${((sonar.error / sonar.configured) * 100).toFixed(0)}%` : '-',
            tooltip: `${sonar.error} of ${sonar.configured} sonar projects have 'fail' quality gate`
          }
        ]}
      />
    </ProjectStats>
  );
};

export default RepoSummary;
