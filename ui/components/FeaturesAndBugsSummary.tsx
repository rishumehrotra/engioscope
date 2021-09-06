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
    average: cycleTimes.reduce(add, 0) / cycleTimes.length,
    min: Math.min(...cycleTimes),
    max: Math.max(...cycleTimes)
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
          { title: 'Min', value: prettyMilliseconds(time.min, { compact: true }) },
          { title: 'Max', value: prettyMilliseconds(time.max, { compact: true }) }
        ]}
      />
    </ProjectStats>
  );
};

export default FeaturesAndBugsSummary;

