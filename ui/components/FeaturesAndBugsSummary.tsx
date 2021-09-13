import prettyMilliseconds from 'pretty-ms';
import { sum } from 'rambda';
import React, { useMemo } from 'react';
import type { AnalysedWorkItems, UIWorkItem } from '../../shared/types';
import { num } from '../helpers/utils';
import type { ProjectStatProps } from './ProjectStat';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';

const computeBugLeakage = (bugLeakage: AnalysedWorkItems['bugLeakage']) => {
  if (!bugLeakage) return [];
  const aggregated = Object.values(bugLeakage).reduce<{ opened: number; closed: number}>((acc, item) => ({
    opened: acc.opened + item.opened.length,
    closed: acc.closed + item.closed.length
  }), {
    opened: 0,
    closed: 0
  });

  return [{
    topStats: [{ title: 'Bug leakage #', value: num(aggregated.opened) }]
  },
  { topStats: [{ title: 'Bugs closed #', value: num(aggregated.closed) }] }
  ];
};

const computeLeadTimesForFeatures = (workItems: UIWorkItem[]) => {
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

const FeaturesAndBugsSummary: React.FC<FeaturesAndBugsSummaryProps> = ({ workItems, bugLeakage }) => {
  const computedStats = useMemo(
    () => [
      ...computeLeadTimesForFeatures(workItems),
      ...computeBugLeakage(bugLeakage)
    ],
    [workItems, bugLeakage]
  );

  return (
    <ProjectStats>
      {computedStats.map(stat => (
        <ProjectStat key={stat.topStats[0].title} topStats={stat.topStats} />
      ))}
    </ProjectStats>
  );
};

export default FeaturesAndBugsSummary;

