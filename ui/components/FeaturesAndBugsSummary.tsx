import prettyMilliseconds from 'pretty-ms';
import { add } from 'rambda';
import React, { useMemo } from 'react';
import type { UIWorkItem } from '../../shared/types';
import type { ProjectStatProps } from './ProjectStat';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';

const computeStats = (workItems: UIWorkItem[]) => {
  const aggregated = workItems.reduce<Record<string, number[]>>(
    (acc, workItem) => ({
      ...acc,
      [workItem.type]: [
        ...(acc[workItem.type] || []),
        ...(workItem.cycleTime.end
          ? [new Date(workItem.cycleTime.end).getTime() - new Date(workItem.cycleTime.start).getTime()]
          : []
        )
      ]
    }), {}
  );

  return Object.entries(aggregated).map<ProjectStatProps>(([type, times]) => ({
    title: `${type} cycle time`,
    value: times.length ? prettyMilliseconds(times.reduce(add, 0) / times.length, { compact: true }) : '-',
    tooltip: `
      Average cycle time for a ${type.toLowerCase()}
      <br />
      Cycle time is the the time from when the ${type.toLowerCase()}
      <br />
      was created to the time when it was closed.
      ${times.length === 0 ? `<div class="text-red-300">No matching ${type.toLowerCase()} is closed</div>` : ''}
    `,
    childStats: [
      {
        title: 'Min',
        value: times.length ? prettyMilliseconds(Math.min(...times), { compact: true }) : '-',
        tooltip: `Minimum cycle time for a ${type.toLowerCase()}`
      },
      {
        title: 'Max',
        value: times.length ? prettyMilliseconds(Math.max(...times), { compact: true }) : '-',
        tooltip: `Maximum cycle time for a ${type.toLowerCase()}`
      }
    ]
  }));
};

const FeaturesAndBugsSummary: React.FC<{ workItems: UIWorkItem[] }> = ({ workItems }) => {
  const computedStats = useMemo(
    () => computeStats(workItems),
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

