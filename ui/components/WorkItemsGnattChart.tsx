import React from 'react';
import { AnalysedWorkItem, UIWorkItemRevision } from '../../shared/types';
import { mediumDate } from '../helpers';

type WorkItemsGnattChartProps = {
  workItem: AnalysedWorkItem;
};

const svgWidth = 1200;
const textWidth = 300;
const textHeight = 30;
const barStartPadding = 30;

const WorkItemsGnattChart: React.FC<WorkItemsGnattChartProps> = ({ workItem }) => {
  const minDateTime = Math.min(
    new Date(workItem.source.revisions[0].date).getTime(),
    ...workItem.targets.map(target => new Date(target.revisions[0].date).getTime())
  );
  const maxDateTime = Math.max(
    new Date(workItem.source.revisions[workItem.source.revisions.length - 1].date).getTime(),
    ...workItem.targets.map(target => new Date(target.revisions[target.revisions.length - 1].date).getTime())
  );
  const timeToXCoord = (time: string) => {
    const date = new Date(time);

    return ((
      (date.getTime() - minDateTime)
      / (maxDateTime - minDateTime)
    ) * (svgWidth - textWidth - barStartPadding)) + textWidth + barStartPadding;
  };

  const barWidth = (revisions: UIWorkItemRevision[], index: number) => {
    if (revisions.length === 1) {
      return Math.max(svgWidth - timeToXCoord(revisions[0].date), 3);
    }
    return Math.max(timeToXCoord(revisions[index + 1].date) - timeToXCoord(revisions[index].date), 3);
  };

  return (
    <svg viewBox={`0 0 ${svgWidth} ${textHeight * workItem.targets.length}`}>
      <title>
        Gnatt chart for
        {' '}
        {workItem.source.title}
      </title>
      {workItem.targets.map((target, workItemIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <g key={target.title + workItemIndex}>
          <foreignObject x="20" y={workItemIndex * textHeight} width={textWidth} height={textHeight}>
            <a
              href={target.url}
              className="text-blue-600 truncate w-full inline-block"
              style={{ width: `${textWidth}px` }}
              target="_blank"
              rel="noreferrer"
              title={`${target.type}: ${target.title}`}
            >
              <img
                src={target.icon}
                alt={`Icon for ${target.type}`}
                width="16"
                className="float-left mt-1 mr-1"
              />
              {target.title}
            </a>
          </foreignObject>
          {target.revisions.slice(0, -1).map((revision, index) => (
            <rect
              x={timeToXCoord(revision.date)}
              y={workItemIndex * textHeight}
              width={barWidth(target.revisions, index)}
              height={textHeight - 5}
              fill="black"
              rx={5}
              key={revision.date}
            >
              <title>
                {revision.state}
                {' '}
                ➜
                {' '}
                {target.revisions[index + 1].state}
                {'\n'}
                {mediumDate(new Date(revision.date))}
                {' '}
                ➜
                {' '}
                {mediumDate(new Date(target.revisions[index + 1].date))}
              </title>
            </rect>
          ))}
        </g>
      ))}
    </svg>
  );
};

export default WorkItemsGnattChart;
