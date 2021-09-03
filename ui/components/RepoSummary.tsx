import React from 'react';
import type { RepoAnalysis } from '../../shared/types';
import { num } from '../helpers/utils';

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
    <div className="justify-end flex items-center">
      <ul className="flex flex-nowrap justify-items-center">
        <li className="p-2 border border-gray-200 bg-white shadow-sm mr-1 rounded">
          <div className="mx-2 flex flex-col justify-end">
            <h3 className="text-xs font-medium">Tests</h3>
            <div className="font-bold text-2xl">
              {num(repos
                .reduce(
                  (acc, r) => acc + (r.tests?.total || 0),
                  0
                ))}
            </div>
          </div>
        </li>
        <li className="p-2 border border-gray-200 bg-white shadow-sm mr-1 rounded flex">
          <div className="mx-2 flex flex-col h-full justify-end">
            <h3 className="text-xs font-medium mr-4">Builds</h3>
            <div className="font-bold text-2xl">
              {num(repos
                .reduce(
                  (acc, r) => acc + (r.builds?.count || 0),
                  0
                ))}
            </div>
          </div>

          <div className="mx-2 flex flex-col h-full justify-end">
            <h3 className="text-xs">Success</h3>
            <div className="font-bold leading-7">
              {buildSuccessRate(repos)}
            </div>
          </div>
        </li>
        <li className="p-2 border border-gray-200 bg-white shadow-sm rounded flex">
          <div className="mx-2 flex flex-col justify-end">
            <h3 className="text-xs font-medium mr-4">Sonar</h3>
            <div className="font-bold text-2xl">
              {num(sonar.configured)}
            </div>
          </div>

          <div className="mx-2 flex flex-col justify-end">
            <h3 className="text-xs">Ok</h3>
            <div className="font-bold leading-7">
              {sonar.ok}
            </div>
          </div>
          <div className="mx-2 flex flex-col justify-end">
            <h3 className="text-xs">Warn</h3>
            <div className="font-bold leading-7">
              {sonar.warn}
            </div>
          </div>
          <div className="mx-2 flex flex-col justify-end">
            <h3 className="text-xs">Error</h3>
            <div className="font-bold leading-7">
              {sonar.error}
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
};

export default RepoSummary;

