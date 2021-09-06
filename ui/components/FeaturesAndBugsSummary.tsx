import prettyMilliseconds from 'pretty-ms';
import { add } from 'rambda';
import React from 'react';
import type { UIWorkItem } from '../../shared/types';
import { exists } from '../helpers/utils';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';

const cycleTime = (workItems: UIWorkItem[]) => {
  const cycleTimes = workItems
    .map(({ cycleTime }) => (
      cycleTime.end
        ? (new Date(cycleTime.end).getTime() - new Date(cycleTime.start).getTime())
        : undefined
    ))
    .filter(exists);

  return {
    average: cycleTimes.length ? cycleTimes.reduce(add, 0) / cycleTimes.length : 0,
    min: cycleTimes.length ? Math.min(...cycleTimes) : undefined,
    max: cycleTimes.length ? Math.max(...cycleTimes) : undefined
  };
};

const FeaturesAndBugsSummary: React.FC<{ workItems: UIWorkItem[] }> = ({ workItems }) => {
  const time = cycleTime(workItems);

  return (
    <ProjectStats>
      <ProjectStat
        title="Average cycle time"
        value={prettyMilliseconds(time.average, { compact: true })}
        childStats={[
          { title: 'Min', value: time.min ? prettyMilliseconds(time.min, { compact: true }) : '-' },
          { title: 'Max', value: time.max ? prettyMilliseconds(time.max, { compact: true }) : '-' }
        ]}
      />
    </ProjectStats>
  );
};

export default FeaturesAndBugsSummary;

