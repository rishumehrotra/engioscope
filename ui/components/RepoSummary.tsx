import React from 'react';
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
      configured: acc.configured + (r.codeQuality ? 1 : 0),
      ok: acc.ok + (r.codeQuality?.qualityGate.toLowerCase() === 'ok' ? 1 : 0),
      warn: acc.warn + (r.codeQuality?.qualityGate.toLowerCase() === 'warn' ? 1 : 0),
      error: acc.error + (r.codeQuality?.qualityGate.toLowerCase() === 'error' ? 1 : 0)
    }),
    {
      configured: 0, ok: 0, warn: 0, error: 0
    }
  )
);

const RepoSummary: React.FC<{ repos: RepoAnalysis[] }> = ({ repos }) => {
  const sonar = sonarStats(repos);

  return (
    <ProjectStats>
      <ProjectStat
        topStats={[{
          title: 'Tests',
          value: num(repos.reduce(
            (acc, r) => acc + (r.tests?.total || 0),
            0
          )),
          tooltip: 'Total number of tests across all matching repos'
        }]}

      />
      <ProjectStat
        topStats={[{
          title: 'Builds',
          value: num(repos.reduce(
            (acc, r) => acc + (r.builds?.count || 0),
            0
          )),
          tooltip: 'Total number of builds across all matching repos'

        }]}
        childStats={[{
          title: 'Success',
          value: buildSuccessRate(repos),
          tooltip: 'Success rate across all matching repos'
        }]}
      />
      <ProjectStat
        topStats={[{
          title: 'Sonar',
          value: num(sonar.configured),
          tooltip: 'Number of matching repos with SonarQube configured'
        }]}
        childStats={[
          { title: 'Ok', value: String(sonar.ok), tooltip: 'Number of matching repos with SonarQube \'Ok\' quality gate' },
          { title: 'Warn', value: String(sonar.warn), tooltip: 'Number of matching repos with SonarQube \'Warn\' quality gate' },
          { title: 'Error', value: String(sonar.error), tooltip: 'Number of matching repos with SonarQube \'Error\' quality gate' }
        ]}
      />
    </ProjectStats>
  );
};

export default RepoSummary;

