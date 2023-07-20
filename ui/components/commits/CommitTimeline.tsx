import React from 'react';
import { minPluralise, shortDate } from '../../helpers/utils.js';

type CommitsTimelineItem = {
  date: string;
  total: number;
};

export const timelineProp = (commits: CommitsTimelineItem[]) => {
  const dateCommits: Record<string, number> = {};
  commits.forEach(commit => {
    dateCommits[commit.date] = commit.total;
  });

  return dateCommits;
};

type CommitTimelineProps = {
  timeline: ReturnType<typeof timelineProp>;
  max: number;
  queryPeriodDays: number;
  className?: string;
};

const barWidth = 4;
const barSpacing = 1;
const svgHeight = 30;
const gapAboveAxis = 3;

const dateString = (date: Date) => date.toISOString().split('T')[0];
const range = (max: number) => [...Array.from({ length: max }).keys()];

const CommitTimeline: React.FC<CommitTimelineProps> = ({
  timeline,
  max,
  queryPeriodDays,
  className,
}) => {
  const startDate = new Date();
  startDate.setDate(new Date().getDate() - queryPeriodDays);
  const svgWidth = (barWidth + barSpacing) * queryPeriodDays;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width={svgWidth}
      height={svgHeight}
      className={className}
    >
      {range(queryPeriodDays + 1).map(day => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + day);
        const commitsForThisDay = timeline[dateString(date)];

        if (!commitsForThisDay) return null;

        const barHeight = commitsForThisDay
          ? (commitsForThisDay * (svgHeight - gapAboveAxis)) / max
          : 1;

        return (
          <rect
            key={day}
            x={(barWidth + barSpacing) * day}
            y={svgHeight - barHeight - gapAboveAxis}
            width={barWidth}
            height={barHeight}
            className="fill-theme-success"
            data-tooltip-id="react-tooltip"
            data-tooltip-content={`${commitsForThisDay} ${minPluralise(
              commitsForThisDay,
              'commit',
              'commits'
            )} on ${shortDate(date)}`}
          />
        );
      })}
      <line
        x1={0}
        y1={svgHeight}
        x2={svgWidth}
        y2={svgHeight}
        strokeWidth={1}
        className="stroke-theme-separator"
      />
    </svg>
  );
};

export default CommitTimeline;
