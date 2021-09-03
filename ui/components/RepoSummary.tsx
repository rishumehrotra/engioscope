import React from 'react';
import type { RepoAnalysis } from '../../shared/types';

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
    <ul>
      <li>
        <h3>Tests</h3>
        <div>
          {repos
            .reduce(
              (acc, r) => acc + (r.tests?.total || 0),
              0
            )}
        </div>
      </li>
      <li>
        <h3>Builds</h3>
        <div>
          Total:
          {repos
            .reduce(
              (acc, r) => acc + (r.builds?.count || 0),
              0
            )}
        </div>
        <div>
          Success rate:
          {buildSuccessRate(repos)}
        </div>
      </li>
      <li>
        <h3>Code quality</h3>
        <div>
          Sonar configured:
          {sonar.configured}
        </div>
        <div>
          Quality gates:
          <ul>
            <li>
              Ok:
              {' '}
              {sonar.ok}
            </li>
            <li>
              Warn:
              {' '}
              {sonar.warn}
            </li>
            <li>
              Error:
              {' '}
              {sonar.error}
            </li>
          </ul>
        </div>
      </li>
    </ul>
  );
};

export default RepoSummary;

