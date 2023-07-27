import React, { Fragment } from 'react';
import { divide, toPercentage } from '../../shared/utils.js';
import { AlertTriangle } from './common/Icons.js';
import { envRowTooltip } from './OverviewGraphs/helpers/tooltips.js';
import { useQueryPeriodDays } from '../hooks/query-hooks.js';

type UsageByEnvProps = {
  perEnvUsage: Record<
    string,
    {
      successful: number;
      total: number;
    }
  >;
  pipelineCount?: number;
};

const doesDeploysCountSeemInconsistent = (
  perEnvUsage: [string, { successful: number; total: number }][],
  index: number
) => {
  if (index === 0) return false;
  return perEnvUsage[index - 1][1].successful < perEnvUsage[index][1].total;
};

const UsageByEnv: React.FC<UsageByEnvProps> = ({ perEnvUsage, pipelineCount }) => {
  const queryPeriodDays = useQueryPeriodDays();
  const max = Math.max(...Object.values(perEnvUsage).map(({ total }) => total));
  const allEnvs = Object.entries(perEnvUsage);
  return (
    <div className="grid grid-cols-4 gap-3 items-center">
      {allEnvs.map(([env, { successful, total }], index) => (
        <Fragment key={env}>
          <div
            className="font-semibold text-sm flex items-center justify-end"
            {...(doesDeploysCountSeemInconsistent(allEnvs, index)
              ? {
                  'data-tooltip-id': 'react-tooltip',
                  'data-tooltip-html': `
                  <b>${env} </b>
                  has more deployments
                  (<b>${total}</b>)
                  than successful
                  <b> ${allEnvs[index - 1][0]}</b>
                  deployments
                  (<b>${allEnvs[index - 1][1].successful}</b>)
              `,
                }
              : {})}
          >
            {doesDeploysCountSeemInconsistent(allEnvs, index) && (
              <AlertTriangle className="w-4 h-4 inline-block mr-1" />
            )}
            {env}
          </div>
          <div
            className="relative w-full col-span-3"
            data-tooltip-id="react-tooltip"
            data-tooltip-html={envRowTooltip(env, successful, total, pipelineCount)}
          >
            <div
              className="absolute top-0 left-0 h-full bg-lime-200 rounded-r-md border border-lime-300 z-10"
              style={{ width: `${(total * 100) / max}%` }}
            />
            <div
              className="absolute top-0 left-0 h-full bg-lime-500 rounded-r-md z-10"
              style={{ width: `${(successful * 100) / max}%` }}
            />
            <div className="text-sm pl-2 py-0.5 z-20 relative">
              <b>
                {divide(total, queryPeriodDays)
                  .map(x => x.toFixed(2).replace('.00', ''))
                  .getOr('0')}
              </b>
              <span className="text-xs">{` deploys/day${total > 0 ? ', ' : ''}`}</span>
              {divide(successful, total)
                .map(toPercentage)
                .map(percent => (
                  <>
                    <b>{percent}</b>
                    <span className="text-xs">{' success rate'}</span>
                  </>
                ))
                .getOr(null)}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
};

export default UsageByEnv;
