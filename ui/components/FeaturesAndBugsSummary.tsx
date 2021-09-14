import prettyMilliseconds from 'pretty-ms';
import { sum } from 'rambda';
import React, { useMemo, useState } from 'react';
import type { AnalysedWorkItems, UIWorkItem } from '../../shared/types';
import { num } from '../helpers/utils';
import usePopover from '../hooks/use-popover';
import type { ProjectStatProps } from './ProjectStat';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';
import WorkItemCharts from './WorkItemCharts';

const computeBugLeakage = (bugLeakage: AnalysedWorkItems['bugLeakage']): ProjectStatProps[] => {
  if (!bugLeakage) return [];
  const aggregated = Object.values(bugLeakage).reduce<{ opened: number; closed: number}>((acc, item) => ({
    opened: acc.opened + item.opened.length,
    closed: acc.closed + item.closed.length
  }), {
    opened: 0,
    closed: 0
  });

  return [{
    topStats: [{ title: 'Bug leakage #', value: num(aggregated.opened) }],
    type: 'bugLeakage'
  },
  {
    topStats: [{ title: 'Bugs closed #', value: num(aggregated.closed) }],
    type: 'bugsClosed'
  }
  ];
};

const computeLeadTimes = (workItems: UIWorkItem[]) => {
  const aggregated = workItems.reduce<Record<string, Record<string, number[]>>>(
    (acc, workItem) => {
      if (!workItem.leadTime.end) return acc;
      return ({
        ...acc,
        [workItem.type]: {
          ...acc[workItem.type],
          lt: [
            ...(acc[workItem.type]?.clt || []),
            ...(workItem.leadTime.end
              ? [new Date(workItem.leadTime.end).getTime() - new Date(workItem.leadTime.start).getTime()]
              : [])
          ],
          clt: [
            ...(acc[workItem.type]?.clt || []),
            ...(workItem.clt?.end && workItem.clt?.start
              ? [new Date(workItem.clt.end).getTime() - new Date(workItem.clt.start).getTime()]
              : [])
          ]
        }
      });
    }, {}
  );

  return Object.entries(aggregated)
    .flatMap<ProjectStatProps>(([type, timesByType]) => ({
      type: type.toLowerCase() as ChartType,
      topStats: Object.entries(timesByType).map(([cltOrLt, times]) => ({
        title: `${type} ${cltOrLt === 'clt' ? 'CLT' : 'lead time'}`,
        value: times.length
          ? prettyMilliseconds(sum(times) / times.length, { compact: true })
          : '-',
        tooltip: `
      Average lead time for a ${type.toLowerCase()}
      <br />
      Lead time is the the time from when the ${type.toLowerCase()}
      <br />
      was created to when it was closed.
      `
      }))
    }));
};

type FeaturesAndBugsSummaryProps = {
  workItems: UIWorkItem[];
  bugLeakage: AnalysedWorkItems['bugLeakage'];
};

export type ChartType = 'feature' | 'bug' | 'bugLeakage' | 'bugsClosed' | undefined;

const FeaturesAndBugsSummary: React.FC<FeaturesAndBugsSummaryProps> = ({ workItems, bugLeakage }) => {
  const [chartType, setChartType] = useState<ChartType>(undefined);
  const [ref, isOpen, setIsOpen] = usePopover();

  const selectChartType = (type: ChartType) => {
    setChartType(type);
  };

  const computedStats = useMemo(
    () => [
      ...computeLeadTimes(workItems),
      ...computeBugLeakage(bugLeakage)
    ],
    [workItems, bugLeakage]
  );

  return (
    <div>
      <ProjectStats>
        {computedStats.map(stat => (
          <ProjectStat
            key={stat.topStats[0].title}
            topStats={stat.topStats}
            onClick={() => {
              setIsOpen(!isOpen);
              selectChartType(stat.type);
            }}
          />
        ))}
      </ProjectStats>
      { isOpen ? (
        <WorkItemCharts
          ref={ref}
          workItems={workItems}
          bugLeakage={bugLeakage}
          chartType={chartType}
        />
      ) : null}
    </div>
  );
};

export default FeaturesAndBugsSummary;

