import React from 'react';
import type { UICommits } from '../../../shared/types.js';
import { shortDate } from '../../helpers/utils.js';

type CommitTimelineProps = {
  timeline: UICommits['byDev'][number]['byDate'];
  max: number;
  queryPeriodDays: number;
};

const barWidth = 10;
const barSpacing = 2;
const svgHeight = 50;

const dateString = (date: Date) => date.toISOString().split('T')[0];
const range = (max: number) => [...Array.from({ length: max }).keys()];

const CommitTimeline: React.FC<CommitTimelineProps> = ({
  timeline,
  max,
  queryPeriodDays,
}) => {
  const startDate = new Date();
  startDate.setDate(new Date().getDate() - queryPeriodDays);
  const svgWidth = (barWidth + barSpacing) * queryPeriodDays;

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%">
      {range(queryPeriodDays + 1).map(day => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + day);
        const commitsForThisDay = timeline[dateString(date)];
        const barHeight = commitsForThisDay ? (commitsForThisDay * svgHeight) / max : 1;

        return (
          <rect
            key={day}
            fill={commitsForThisDay ? 'green' : '#ddd'}
            x={(barWidth + barSpacing) * day}
            y={svgHeight - barHeight}
            width={barWidth}
            height={barHeight}
            data-tooltip-id="react-tooltip"
            data-tooltip-content={`${commitsForThisDay || 0} commit${
              commitsForThisDay === 1 ? '' : 's'
            } on ${shortDate(date)}`}
          />
        );
      })}
    </svg>
  );
};

export default CommitTimeline;
