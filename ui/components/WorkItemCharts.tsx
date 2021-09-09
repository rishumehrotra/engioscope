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

type WorkItemType = string;
type WorkItemEnvironment = string;

const workItemsByTypeAndEnv = (workItems: UIWorkItem[]) => workItems
  .reduce<Record<WorkItemType, Record<'clt' | 'lt', Record<WorkItemEnvironment, UIWorkItem[]>>>>(
    (acc, workItem) => ({
      ...acc,
      [workItem.type]: {
        ...acc[workItem.type],
        'clt': {
          ...(acc[workItem.type] || {}).clt,
          [workItem.env || 'default-env']: [
            ...((acc[workItem.type] || {}).clt || {})[workItem.env || 'default-env'] || [],
            ...(hasCLT(workItem) ? [workItem] : [])
          ]
        },
        'lt': {
          ...(acc[workItem.type] || {}).lt,
          [workItem.env || 'default-env']: [
            ...((acc[workItem.type] || {}).lt || {})[workItem.env || 'default-env'] || [],
            ...(hasLeadTime(workItem) ? [workItem] : [])
          ]
        }
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
        <div style={{ width: '200px', height: '400px' }} key={type}>
          <ScatterLineGraph
            key={type}
            graphData={[
              {
                label: 'Change lead time',
                data: statByCltOrLtByEnv.clt,
                yAxisPoint: getCLTTime
              },
              {
                label: 'Lead time',
                data: statByCltOrLtByEnv.lt,
                yAxisPoint: getLeadTime
              }
            ]}
            height={400}
            width={200}
          />
          {type}
        </div>
      ))}
    </div>
  );
};

export default WorkItemCharts;
