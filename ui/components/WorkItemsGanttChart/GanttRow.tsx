import React, { useEffect, useMemo, useState } from 'react';
import ReactTooltip from 'react-tooltip';
import prettyMilliseconds from 'pretty-ms';
import type { UIWorkItem, UIWorkItemRevision } from '../../../shared/types';
import {
  textWidth, textHeight,
  rowPadding, svgWidth, makeTransparent, barYCoord,
  barHeight, revisionTitle, contrastColour, barWidthUsing, makeDarker, barStartPadding
} from './helpers';
import { TreeNodeButton } from './TreeNodeButton';
import type { ExpandedState } from './types';

type CltStats = {clt: number| undefined; cltStage: 'dev not done' | 'dev done' | 'done'};

const cltStats = (workItem: UIWorkItem): CltStats => {
  if (workItem.clt?.start && workItem.clt.end) {
    return {
      cltStage: 'done',
      clt: new Date(workItem.clt?.end).getTime() - new Date(workItem.clt?.start).getTime()
    };
  }
  if (workItem.clt?.start && !workItem.clt?.end) {
    return {
      cltStage: 'dev done',
      clt: new Date().getTime() - new Date(workItem.clt?.start).getTime()
    };
  }
  return {
    cltStage: 'dev not done',
    clt: undefined
  };
};

const cltStatsTooltip = (cltStats: CltStats) => {
  const { clt, cltStage } = cltStats;
  if (clt === undefined) return null;
  const prettyClt = prettyMilliseconds(clt, { compact: true, verbose: true });
  if (cltStage === 'done') {
    return `<span>CLT(Dev done to Actual production ): ${prettyClt}</span>`;
  }
  if (cltStage === 'dev done') {
    return `<span class="capitalize">${cltStage}: since ${prettyClt}</span>`;
  }
};

const cltStatsLabel = (cltStats: CltStats) => {
  const { clt, cltStage } = cltStats;
  if (clt === undefined) return null;
  const prettyClt = prettyMilliseconds(clt, { compact: true });
  if (cltStage === 'done') {
    return <span className="text-xs font-bold text-green-600">{prettyClt}</span>;
  }
  if (cltStage === 'dev done') {
    return <span className="text-xs font-bold text-red-800">{prettyClt}</span>;
  }
};

export type GanttRowProps = {
  workItem: UIWorkItem;
  isLast: boolean;
  rowIndex: number;
  indentation: number;
  expandedState: ExpandedState;
  timeToXCoord: (time: string) => number;
  onToggle: (e: React.MouseEvent) => void;
  colorForStage: (stage: string) => string;
  revisions: 'loading' | UIWorkItemRevision[];
};

export const GanttRow: React.FC<GanttRowProps> = ({
  workItem, rowIndex, indentation, isLast, timeToXCoord,
  colorForStage, expandedState, onToggle, revisions
}) => {
  const barWidth = barWidthUsing(timeToXCoord);
  const [isHighlighted, highlight] = useState<boolean>(false);

  const { cltStage, clt } = cltStats(workItem);

  const rowColor = useMemo(() => {
    const baseColor = makeTransparent(`#${workItem.color}`);
    return isHighlighted ? makeDarker(baseColor) : baseColor;
  }, [isHighlighted, workItem.color]);

  useEffect(() => { ReactTooltip.rebuild(); }, [revisions]);

  return (
    <g onMouseOver={() => highlight(true)} onMouseLeave={() => highlight(false)}>
      <rect
      // background
        x="0"
        y={(textHeight + (rowPadding * 2)) * rowIndex}
        width={svgWidth}
        height={textHeight}
        fill={rowColor}
      />
      <foreignObject
      // The stuff on the left
        x="10"
        y={(textHeight + (rowPadding * 2)) * rowIndex}
        width={textWidth}
        height={textHeight}
      >
        <div className="flex items-center">
          <TreeNodeButton
            expandedState={expandedState}
            onToggle={onToggle}
            indentation={indentation}
          />
          <a
            href={workItem.url}
            className="link-text text truncate flex mt-1 items-center text-sm"
            style={{ width: `${textWidth}px` }}
            target="_blank"
            rel="noreferrer"
            data-html
            data-tip={`<p><div class="text-bold">${workItem.type}: ${workItem.title}</div>${cltStatsTooltip({ cltStage, clt })}</p>`}
          >
            <img
              src={workItem.icon}
              alt={`Icon for ${workItem.type}`}
              width="16"
              className="float-left mr-1"
            />
            {cltStatsLabel({ clt, cltStage })}
            &nbsp;
            {workItem.title}
          </a>
        </div>
      </foreignObject>
      {revisions === 'loading' ? (
        <foreignObject
          x={textWidth + barStartPadding + 10}
          y={barYCoord(rowIndex)}
          width={svgWidth - textWidth - barStartPadding - 10}
          height={barHeight}
          className="pointer-events-none"
        >
          <div className="text-xs pl-1 w-full text-gray-500">
            Loading...
          </div>
        </foreignObject>
      ) : (
        revisions.slice(0, -1).map((revision, revisionIndex) => (
          // The actual gantt bar
          <g key={revision.state + revision.date}>
            <rect
              x={timeToXCoord(revision.date)}
              y={barYCoord(rowIndex)}
              width={barWidth(revisions, revisionIndex)}
              height={barHeight}
              fill={colorForStage(revision.state)}
              key={revision.date}
              data-tip={revisionTitle(revision, revisions[revisionIndex + 1]).join('<br />')}
              data-html
            />
            {barWidth(revisions, revisionIndex) > 25 ? (
              <foreignObject
                x={timeToXCoord(revision.date)}
                y={barYCoord(rowIndex)}
                width={barWidth(revisions, revisionIndex)}
                height={barHeight}
                className="pointer-events-none"
              >
                <span
                  style={{ color: contrastColour(colorForStage(revision.state)) }}
                  className="text-xs pl-1 truncate inline-block w-full"
                >
                  {revisionTitle(revision, revisions[revisionIndex + 1]).join(', ')}
                </span>
              </foreignObject>
            ) : null}
          </g>
        ))
      )}
      {!isLast ? (
        <line
          x1="0"
          y1={(textHeight + (rowPadding * 2)) * rowIndex - rowPadding}
          x2={svgWidth}
          y2={(textHeight + (rowPadding * 2)) * rowIndex - rowPadding}
          strokeWidth="1"
          stroke="#ddd"
        />
      ) : null}
    </g>
  );
};
