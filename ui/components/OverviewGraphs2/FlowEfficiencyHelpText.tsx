import React from 'react';
import { stringifyDateField } from '../OverviewGraphs/helpers/helpers.js';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';

export const FlowEfficiencyHelpText = ({
  workItemConfig,
  index,
}: {
  workItemConfig: SingleWorkItemConfig | undefined;
  index: number;
}) => {
  return (
    <div className="mt2" style={{ gridArea: `graphFooter${index}` }}>
      <details>
        <summary className="cursor-pointer text-gray-600 text-sm font-normal">
          {`Flow efficiency for ${workItemConfig?.name[1]} is the time spent in `}
          {workItemConfig?.workCenters?.map(wc => wc.label).join(', ')}
          {' divided by the total time.'}
        </summary>
        <ul className="pl-8 list-disc mb-2">
          {workItemConfig?.workCenters?.map(wc => (
            <li key={wc.label} className="text-gray-600 text-sm font-normal">
              {`Time spent in '${wc.label}' is computed from ${stringifyDateField(
                wc?.startStates || []
              )} to ${stringifyDateField(wc?.endStates || [])}.`}
            </li>
          ))}
          <li className="text-gray-600 text-sm font-normal">
            {`Total time is the time from ${stringifyDateField(
              workItemConfig?.startStates || []
            )} to ${stringifyDateField(workItemConfig?.startStates || [])}.`}
          </li>
        </ul>
      </details>
    </div>
  );
};
