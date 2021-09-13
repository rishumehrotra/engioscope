import prettyMilliseconds from 'pretty-ms';
import { add, sum } from 'rambda';
import React, { useMemo } from 'react';
import type { AnalysedWorkItems, UIWorkItem } from '../../shared/types';
import { num } from '../helpers/utils';
import type { ProjectStatProps } from './ProjectStat';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';

const computeLeadTimes = (workItems: UIWorkItem[]) => {
  const aggregated = workItems.reduce<Record<string, Record<string, number[]>>>(
    (acc, workItem) => {
      if (!workItem.leadTime.end) return acc;
      return ({
        ...acc,
        [workItem.type]: {
          ...acc[workItem.type],
          'default-env': [
            ...(acc[workItem.type]?.[workItem.env || 'default-env'] || []),
            ...(workItem.leadTime.end
              ? [new Date(workItem.leadTime.end).getTime() - new Date(workItem.leadTime.start).getTime()]
              : [])
          ]
        }
      });
    }, {}
  );

  return Object.entries(aggregated).flatMap<ProjectStatProps>(([type, timesByEnv]) => {
    if (Object.keys(timesByEnv).length === 1 && timesByEnv['default-env']) {
      return [{
        title: `${type} lead time`,
        value: timesByEnv['default-env'].length
          ? prettyMilliseconds(timesByEnv['default-env'].reduce(add, 0) / timesByEnv['default-env'].length, { compact: true })
          : '-',
        tooltip: `
      Average lead time for a ${type.toLowerCase()}
      <br />
      Lead time is the the time from when the ${type.toLowerCase()}
      <br />
      was created to when it was closed.
      ${timesByEnv['default-env'].length === 0 ? `<div class="text-red-300">No matching ${type.toLowerCase()} is closed</div>` : ''}
      `,
        childStats: [
          {
            title: 'Min',
            value: timesByEnv['default-env'].length ? prettyMilliseconds(Math.min(...timesByEnv['default-env']), { compact: true }) : '-',
            tooltip: `Minimum lead time for a ${type.toLowerCase()}`
          },
          {
            title: 'Max',
            value: timesByEnv['default-env'].length ? prettyMilliseconds(Math.max(...timesByEnv['default-env']), { compact: true }) : '-',
            tooltip: `Maximum lead time for a ${type.toLowerCase()}`
          }
        ]
      }];
    }

    return Object.entries(timesByEnv).map(([env, times]) => ({
      title: `${type} lead time ${env}`,
      value: times.length
        ? prettyMilliseconds(sum(times) / times.length, { compact: true })
        : '-',
      tooltip: `
      Average lead time for a ${type.toLowerCase()}
      <br />
      Lead time is the the time from when the ${type.toLowerCase()}
      <br />
      was created to when it was closed.
      `,
      childStats: [
        {
          title: 'Min',
          value: times.length ? prettyMilliseconds(Math.min(...times), { compact: true }) : '-',
          tooltip: `Minimum lead time for a ${type.toLowerCase()}`
        },
        {
          title: 'Max',
          value: times.length ? prettyMilliseconds(Math.max(...times), { compact: true }) : '-',
          tooltip: `Maximum lead time for a ${type.toLowerCase()}`
        }
      ]
    }));
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const computeBugLeakage = (bugLeakage: AnalysedWorkItems['bugLeakage']) => {
  if (!bugLeakage) return [];

  return Object.entries(bugLeakage).flatMap<ProjectStatProps>(([type, { opened, closed }]) => ([
    {
      title: `${type} bug leakage`,
      value: '0',
      childStats: [
        {
          title: 'Opened',
          value: num(opened.length)
        },
        {
          title: 'Closed',
          value: num(closed.length)
        }
      ]
    }
  ]));
};

type FeaturesAndBugsSummaryProps = {
  workItems: UIWorkItem[];
  bugLeakage: AnalysedWorkItems['bugLeakage'];
};

const FeaturesAndBugsSummary: React.FC<FeaturesAndBugsSummaryProps> = ({ workItems }) => {
  const computedStats = useMemo(
    () => [
      ...computeLeadTimes(workItems)
      // ...computeBugLeakage(bugLeakage)
    ],
    [workItems]
  );

  return (
    <ProjectStats>
      {computedStats.map(stat => (
        <ProjectStat key={stat.title} {...stat} />
      ))}
    </ProjectStats>
  );
};

export default FeaturesAndBugsSummary;

