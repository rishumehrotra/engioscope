import React, { Fragment } from 'react';
import { num } from '../helpers/utils';
import { envRowTooltip } from './ReleasePipelineSummary';

const UsageByEnv: React.FC<{ perEnvUsage: Record<string, { successful: number; total: number }> }> = ({
  perEnvUsage
}) => {
  const max = Math.max(...Object.values(perEnvUsage).map(({ total }) => total));
  const allEnvs = Object.entries(perEnvUsage);
  return (
    <div className="grid grid-cols-4 gap-3 items-center">
      {allEnvs.map(([env, { successful, total }], index) => (
        <Fragment key={env}>
          <div
            className="font-semibold text-sm flex items-center justify-end"
            {...((index !== 0 && allEnvs[index - 1][1].total < total) ? ({
              'data-tip': `
                  <b>${env} </b>
                  has more deployments than
                  <b> ${allEnvs[index - 1][0]}</b>
              `,
              'data-html': 'true'
            }) : {})}
          >
            {index !== 0 && allEnvs[index - 1][1].total < total && (
              <span className="bg-orange-600 w-2 h-2 rounded-full inline-block mr-1" />
            )}
            {env}
          </div>
          <div
            className="relative w-full col-span-3"
            data-tip={envRowTooltip(env, successful, total)}
            data-html
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
              <b>{`${num(Math.round(total / 30))}`}</b>
              <span className="text-xs">{' deploys/day, '}</span>
              <b>{`${Math.round((successful * 100) / total)}%`}</b>
              <span className="text-xs">{' success rate'}</span>
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
};

export default UsageByEnv;
