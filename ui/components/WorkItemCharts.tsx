import prettyMilliseconds from 'pretty-ms';
import React, { useMemo } from 'react';
import type { UIWorkItem } from '../../shared/types';
import ScatterLineGraph from './ScatterLineGraph';

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
  console.log({ groupedWorkItems });

  return (
    <div className="flex">
      {Object.entries(groupedWorkItems).map(([type, statByCltOrLtByEnv]) => (
        <div style={{ 'height': '400px', 'marginRight': '100px' }} key={type}>
          <ScatterLineGraph
            key={type}
            height={400}
            graphData={[
              {
                label: 'Change lead time',
                data: statByCltOrLtByEnv.clt,
                yAxisPoint: getCLTTime,
                tooltip: (workItem: UIWorkItem) => `
<div class="w-72">
  #${workItem.id} - ${workItem.title}<br />
  Change lead time: ${prettyMilliseconds(getCLTTime(workItem), { compact: true })}
</div>`.trim()
              },
              {
                label: 'Lead time',
                data: statByCltOrLtByEnv.lt,
                yAxisPoint: getLeadTime,
                tooltip: (workItem: UIWorkItem) => `
<div class="w-72">
  #${workItem.id} - ${workItem.title}<br />
  Lead time: ${prettyMilliseconds(getLeadTime(workItem), { compact: true })}
</div>`.trim()
              }
            ]}
          />
          {type}
        </div>
      ))}
    </div>
  );
};

export default WorkItemCharts;
