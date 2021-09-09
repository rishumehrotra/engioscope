import prettyMilliseconds from 'pretty-ms';
import React, { useMemo } from 'react';
import type { UIWorkItem } from '../../shared/types';
import { oneYear } from '../helpers/utils';
import ScatterLineGraph from './ScatterLineGraph';

const createTooltip = (label: string, xform: (x: UIWorkItem) => number) => (workItem: UIWorkItem) => `
  <div class="w-72">
    <div class="pl-3" style="text-indent: -1.15rem">
      <img src="${workItem.icon}" width="14" height="14" class="inline-block -mt-1" />
      <strong>#${workItem.id}:</strong> ${workItem.title}
      <div class="pt-1">
        <strong>${label}:</strong> ${prettyMilliseconds(
  xform(workItem),
  xform(workItem) < oneYear ? { compact: true } : { unitCount: 2 }
)}
      </div>
    </div>
  </div>
`.trim();

type WorkItemChartsProps = {
  workItems: UIWorkItem[];
  // bugLeakage: AnalysedWorkItems['bugLeakage'];
};

const getCLTTime = (workItem: UIWorkItem) => (
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  new Date(workItem.clt!.end!).getTime() - new Date(workItem.clt!.start!).getTime()
);

const getLeadTime = (workItem: UIWorkItem) => (
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  new Date(workItem.leadTime!.end!).getTime() - new Date(workItem.leadTime!.start!).getTime()
);

const hasCLT = (workItem: UIWorkItem) => {
  if (!workItem.clt) return false;
  if (!workItem.clt.start) return false;
  if (!workItem.clt.end) return false;
  return true;
};

const hasLeadTime = (workItem: UIWorkItem) => {
  if (!workItem.leadTime) return false;
  if (!workItem.leadTime.end) return false;
  return true;
};

const byEnv = (
  label: 'clt' | 'lt',
  acc: Record<string, UIWorkItem[]> | undefined,
  item: UIWorkItem,
  predicate: (x: UIWorkItem) => boolean
) => {
  if (!predicate(item)) return { [label]: acc };
  const env = item.env || 'default-env';
  const newAcc: NonNullable<typeof acc> = acc || {};
  if (!newAcc[env]) newAcc[env] = [];
  newAcc[env].push(item);
  return { [label]: newAcc };
};

type WorkItemType = string;
type WorkItemEnvironment = string;

const workItemsByTypeAndEnv = (workItems: UIWorkItem[]) => workItems
  .reduce<Record<WorkItemType, Record<'clt' | 'lt', Record<WorkItemEnvironment, UIWorkItem[]>>>>(
    (acc, workItem) => ({
      ...acc,
      [workItem.type]: {
        ...acc[workItem.type],
        ...byEnv('clt', (acc[workItem.type] || {}).clt, workItem, hasCLT),
        ...byEnv('lt', (acc[workItem.type] || {}).lt, workItem, hasLeadTime)
      }
    }),
    {}
  );

const WorkItemCharts: React.FC<WorkItemChartsProps> = ({ workItems }) => {
  const groupedWorkItems = useMemo(() => workItemsByTypeAndEnv(workItems), [workItems]);

  return (
    <div className="flex">
      {Object.entries(groupedWorkItems).map(([type, statByCltOrLtByEnv]) => (
        <div className="mr-10 bg-white p-5 rounded-lg mb-3 shadow-md" key={type}>
          <div className="text-center pb-5">{type}</div>

          <ScatterLineGraph
            key={type}
            height={400}
            linkForItem={workItem => workItem.url}
            graphData={[
              {
                label: 'Change lead time',
                data: statByCltOrLtByEnv.clt,
                yAxisPoint: getCLTTime,
                tooltip: createTooltip('Change lead time', getCLTTime)
              },
              {
                label: 'Lead time',
                data: statByCltOrLtByEnv.lt,
                yAxisPoint: getLeadTime,
                tooltip: createTooltip('Lead time', getLeadTime)
              }
            ]}
          />
        </div>
      ))}
    </div>
  );
};

export default WorkItemCharts;
