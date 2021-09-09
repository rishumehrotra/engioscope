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
  // console.log({ groupedWorkItems });

  // const cltWorkItemsByType = useMemo(() => workItems.reduce<Record<string, UIWorkItem[]>>(
  //   (acc, workItem) => {
  //     if (!workItem.clt) return acc;
  //     if (!workItem.clt.start || !workItem.clt.end) return acc;

  //     return {
  //       ...acc,
  //       [workItem.type]: [...(acc[workItem.type] || []), workItem]
  //     };
  //   },
  //   {}
  // ), [workItems]);

  return (
    <div className="flex">
      {Object.entries(groupedWorkItems).map(([type, statByCltOrLtByEnv]) => (
        <div style={{ width: '200px', height: '400px' }}>
          <ScatterLineGraph
            key={type}
            graphData={statByCltOrLtByEnv.clt}
            height={100}
            width={100}
            yAxisPoint={getCLTTime}
          />
          {type}
        </div>
      ))}
    </div>
  );
};

export default WorkItemCharts;
