import prettyMilliseconds from 'pretty-ms';
import { sum } from 'rambda';
import React, { useMemo } from 'react';
import type { AnalysedWorkItems, UIWorkItem } from '../../shared/types';
import { num } from '../helpers/utils';
import type { ChartType, ProjectStatProps } from './ProjectStat';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';

const computeBugLeakage = (
  bugLeakage: AnalysedWorkItems['bugLeakage'],
  workItemTypes: AnalysedWorkItems['types']
): ProjectStatProps[] => {
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
    chartType: 'bugLeakage',
    workItemTypes
  },
  {
    topStats: [{ title: 'Bugs closed #', value: num(aggregated.closed) }],
    chartType: 'bugsClosed',
    workItemTypes
  }
  ];
};

const cltOrLtDefinition = (type: string, cltOrLt: string) => (cltOrLt === 'lt'
  ? `Average turnaround time for a ${type.toLowerCase()}. <br /> 
    Turnaround time is the time from when the ${type.toLowerCase()} <br /> 
    was created to when it was closed.`
  : `Average CLT for a ${type.toLowerCase()}. <br /> 
  CLT is the time from when the ${type.toLowerCase()}<br /> 
  was dev done to when it was closed.`);

const computeLeadTimes = (workItems: UIWorkItem[], workItemTypes: AnalysedWorkItems['types']) => {
  const aggregated = workItems.reduce<Record<string, Record<'clt' | 'lt', number[]>>>(
    (acc, workItem) => {
      if (!workItem.leadTime.end) return acc;
      return ({
        ...acc,
        [workItemTypes[workItem.typeId].name[0]]: {
          ...acc[workItemTypes[workItem.typeId].name[0]],
          lt: [
            ...(acc[workItemTypes[workItem.typeId].name[0]]?.clt || []),
            ...(workItem.leadTime.end
              ? [new Date(workItem.leadTime.end).getTime() - new Date(workItem.leadTime.start).getTime()]
              : [])
          ],
          clt: [
            ...(acc[workItemTypes[workItem.typeId].name[0]]?.clt || []),
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
      chartType: type.toLowerCase() as ChartType,
      workItemTypes,
      topStats: Object.entries(timesByType).map(([cltOrLt, times]) => ({
        title: `${type} ${cltOrLt === 'clt' ? 'CLT' : 'turnaround time'}`,
        value: times.length
          ? prettyMilliseconds(sum(times) / times.length, { compact: true })
          : '-',
        tooltip: cltOrLtDefinition(type, cltOrLt)
      }))
    }));
};

export type FeaturesAndBugsSummaryProps = {
  workItems: UIWorkItem[];
  bugLeakage: AnalysedWorkItems['bugLeakage'];
  workItemTypes: AnalysedWorkItems['types'];
};

const FeaturesAndBugsSummary: React.FC<FeaturesAndBugsSummaryProps> = ({ workItems, bugLeakage, workItemTypes }) => {
  const computedStats = useMemo(
    () => [
      ...computeLeadTimes(workItems, workItemTypes),
      ...computeBugLeakage(bugLeakage, workItemTypes)
    ],
    [workItems, workItemTypes, bugLeakage]
  );

  return (
    <div>
      <ProjectStats>
        {computedStats.map(stat => (
          <ProjectStat
            key={stat.topStats[0].title}
            topStats={stat.topStats}
            workItems={workItems}
            workItemTypes={workItemTypes}
            bugLeakage={bugLeakage}
            chartType={stat.chartType}
            hasPopover
          />
        ))}
      </ProjectStats>

    </div>
  );
};

export default FeaturesAndBugsSummary;

