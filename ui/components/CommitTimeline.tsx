import React from 'react';
import { UICommits } from '../../shared/types';
import { shortDate } from '../helpers';

type CommitTimelineProps = {
  timeline: UICommits['byDev'][number]['byDate'];
  max: number;
}

const barWidth = 10;
const barSpacing = 2;
const svgHeight = 50;
const displayDays = 30;
const svgWidth = (barWidth + barSpacing) * displayDays;

const dateString = (date: Date) => date.toISOString().split('T')[0];
const range = (max: number) => [...Array(max).keys()];

const CommitTimeline: React.FC<CommitTimelineProps> = ({ timeline, max }) => {
  const startDate = new Date();
  startDate.setDate((new Date()).getDate() - displayDays);

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%">
      {range(displayDays + 1).map(day => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + day);
        const commitsForThisDay = timeline[dateString(date)];
        const barHeight = commitsForThisDay ? ((commitsForThisDay * svgHeight) / max) : 1;

        return (
          <rect
            key={day}
            fill={commitsForThisDay ? 'green' : '#ddd'}
            x={(barWidth + barSpacing) * day}
            y={svgHeight - barHeight}
            width={barWidth}
            height={barHeight}
          >
            <title>{`${commitsForThisDay || 0} commit${commitsForThisDay === 1 ? '' : 's'} on ${shortDate(date)}`}</title>
          </rect>
        );
      })}
    </svg>
  );
};

export default CommitTimeline;
