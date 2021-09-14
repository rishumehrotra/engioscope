import prettyMilliseconds from 'pretty-ms';
import React, { useMemo } from 'react';
import type { AnalysedWorkItems, UIWorkItem } from '../../shared/types';
import { oneYear } from '../helpers/utils';
import HorizontalBarGraph from './HorizontalBarGraph';
import type { ChartType } from './ProjectStat';
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

const colors = [
  '#f44336',
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#ff9800',
  '#795548'
];

const assignedColors = new Map();
const barColor = (env: string) => {
  if (!assignedColors.has(env)) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    assignedColors.set(env, color);
  }
  return assignedColors.get(env);
};

export type WorkItemChartsProps = {
  workItems?: UIWorkItem[];
  bugLeakage?: AnalysedWorkItems['bugLeakage'];
  chartType?: ChartType;
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

const WorkItemCharts = React.forwardRef<HTMLDivElement, WorkItemChartsProps>(
  ({ workItems, bugLeakage, chartType }, ref) => {
    const groupedWorkItems = useMemo(() => workItemsByTypeAndEnv(workItems || []), [workItems]);

    return (
      <div style={{ top: '70px' }} className="flex absolute right-0 z-10 bg-white px-5 py-10 rounded-lg mb-3 shadow-md" ref={ref}>
        {Object.entries(groupedWorkItems).map(([type, statByCltOrLtByEnv]) => (chartType === type.toLowerCase() ? (
          <div className="mr-10" key={type}>
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
        ) : null))}
        {bugLeakage && (
          <div className="min-w-max">
            {chartType === 'bugLeakage' ? (
              <>
                <HorizontalBarGraph
                  width={400}
                  graphData={Object.entries(bugLeakage)
                    .map(([type, bugs]) => ({ label: type, value: bugs.opened.length, color: barColor(type) }))}
                />
              </>
            ) : null}
            { chartType === 'bugsClosed'
              ? (
                <>
                  <HorizontalBarGraph
                    width={400}
                    graphData={Object.entries(bugLeakage)
                      .map(([type, bugs]) => ({ label: type, value: bugs.closed.length, color: barColor(type) }))}
                  />
                </>
              )
              : null}
          </div>
        )}
      </div>
    );
  }
);

export default WorkItemCharts;
