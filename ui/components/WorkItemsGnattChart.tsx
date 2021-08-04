import React from 'react';
import { AnalysedWorkItem, UIWorkItemRevision } from '../../shared/types';
import { mediumDate } from '../helpers';

const svgWidth = 1200;
const textWidth = 300;
const textHeight = 30;
const barStartPadding = 30;
const barHeight = 20;
const rowPadding = 3;
const axisLabelsHeight = 20;

const svgHeight = (workItem: AnalysedWorkItem) => (
  ((textHeight + (rowPadding * 2)) * workItem.targets.length) + axisLabelsHeight
);

const barYCoord = (targetIndex: number) => (
  (targetIndex * (textHeight + (rowPadding * 2))) + ((textHeight - barHeight) / 2)
);

type WorkItemsGnattChartProps = {
  workItem: AnalysedWorkItem;
  colorsForStages: Record<string, string>;
};

const getMinDateTime = (workItem: AnalysedWorkItem) => Math.min(
  new Date(workItem.source.revisions[0].date).getTime(),
  ...workItem.targets.map(target => new Date(target.revisions[0].date).getTime())
);

const getMaxDateTime = (workItem: AnalysedWorkItem) => Math.max(
  new Date(workItem.source.revisions[workItem.source.revisions.length - 1].date).getTime(),
  ...workItem.targets.map(target => new Date(target.revisions[target.revisions.length - 1].date).getTime())
);

const createXCoordConverterFor = (workItem: AnalysedWorkItem) => {
  const minDateTime = getMinDateTime(workItem);
  const maxDateTime = getMaxDateTime(workItem);

  return (time: string) => {
    const date = new Date(time);

    return ((
      (date.getTime() - minDateTime)
      / (maxDateTime - minDateTime)
    ) * (svgWidth - textWidth - barStartPadding)) + textWidth + barStartPadding;
  };
};

const barWidthUsing = (timeToXCoord: (time: string) => number) => (
  (revisions: UIWorkItemRevision[], index: number) => {
    if (revisions.length === 1) {
      return Math.max(svgWidth - timeToXCoord(revisions[0].date), 3);
    }
    return Math.max(timeToXCoord(revisions[index + 1].date) - timeToXCoord(revisions[index].date), 3);
  }
);

const makeTransparent = (rgb: string) => {
  if (rgb.length > 7) { // already has a rgbA component
    return `${rgb.slice(0, -2)}11`;
  }

  return `${rgb}11`;
};

const WorkItemsGnattChart: React.FC<WorkItemsGnattChartProps> = ({ workItem, colorsForStages }) => {
  const timeToXCoord = createXCoordConverterFor(workItem);
  const barWidth = barWidthUsing(timeToXCoord);

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight(workItem)}`}>
      <line
        x1={textWidth + barStartPadding}
        x2={textWidth + barStartPadding}
        y1={0}
        y2={svgHeight(workItem) - axisLabelsHeight}
        stroke="#ddd"
        strokeWidth="1"
        strokeDasharray="3,5"
      />
      <foreignObject
        x={textWidth + barStartPadding - 40}
        y={svgHeight(workItem) - axisLabelsHeight}
        width={80}
        height={20}
      >
        <div className="text-xs text-gray-500 text-center">
          {mediumDate(new Date(getMinDateTime(workItem)))}
        </div>
      </foreignObject>
      {workItem.targets.map((target, targetIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <g key={target.title + targetIndex}>
          {targetIndex <= workItem.targets.length - 1 ? (
            <line
              x1="0"
              y1={(textHeight + (rowPadding * 2)) * targetIndex - rowPadding}
              x2={svgWidth}
              y2={(textHeight + (rowPadding * 2)) * targetIndex - rowPadding}
              strokeWidth="1"
              stroke="#ddd"
            />
          ) : null}
          <rect
            x="0"
            y={(textHeight + (rowPadding * 2)) * targetIndex}
            width={svgWidth}
            height={textHeight}
            fill={makeTransparent(`#${target.color}`)}
          />
          <foreignObject
            x="10"
            y={(textHeight + (rowPadding * 2)) * targetIndex}
            width={textWidth}
            height={textHeight}
          >
            <a
              href={target.url}
              className="text-blue-600 truncate w-full mt-1 inline-block text-sm"
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
              y={barYCoord(targetIndex)}
              width={barWidth(target.revisions, index)}
              height={barHeight}
              fill={colorsForStages[revision.state]}
              key={revision.date}
            >
              <title>
                {`${revision.state} → ${target.revisions[index + 1].state}`}
                {'\n'}
                {`${mediumDate(new Date(revision.date))} → ${mediumDate(new Date(target.revisions[index + 1].date))}`}
              </title>
            </rect>
          ))}
        </g>
      ))}
    </svg>
  );
};

export default WorkItemsGnattChart;
