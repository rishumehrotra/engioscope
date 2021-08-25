import React, {
  memo, useCallback, useMemo, useState
} from 'react';
import prettyMilliseconds from 'pretty-ms';
import type { UIWorkItem, UIWorkItemRevision } from '../../../shared/types';
import {
  textWidth, textHeight,
  rowPadding, svgWidth, makeTransparent, barYCoord,
  barHeight, contrastColour, barWidthUsing, makeDarker, barStartPadding
} from './helpers';
import { TreeNodeButton } from './TreeNodeButton';
import type { ExpandedState } from './types';
import { mediumDate } from '../../helpers/utils';

const revisionTitle = (revision: UIWorkItemRevision, nextRevision: UIWorkItemRevision) => (
  <>
    <span className="font-semibold">{`${revision.state} → ${nextRevision.state}`}</span>
    {' '}
    {prettyMilliseconds(new Date(nextRevision.date).getTime() - new Date(revision.date).getTime(), { unitCount: 2 })}
  </>
);

const revisionTooltip = (revision: UIWorkItemRevision, nextRevision: UIWorkItemRevision) => `
  <b>${revision.state} → ${nextRevision.state}</b><br />
  ${prettyMilliseconds(new Date(nextRevision.date).getTime() - new Date(revision.date).getTime(), { unitCount: 2, verbose: true })}<br />
  <div class="text-gray-400">
    ${mediumDate(new Date(revision.date))} → ${mediumDate(new Date(nextRevision.date))}
  </div>
`;

type CltStats = {clt: number| undefined; cltStage: 'Dev not done' | 'Dev done' | 'Done'};

const cltStats = (workItem: UIWorkItem): CltStats => {
  if (workItem.clt?.start && workItem.clt.end) {
    return {
      cltStage: 'Done',
      clt: new Date(workItem.clt?.end).getTime() - new Date(workItem.clt?.start).getTime()
    };
  }
  if (workItem.clt?.start && !workItem.clt?.end) {
    return {
      cltStage: 'Dev done',
      clt: new Date().getTime() - new Date(workItem.clt?.start).getTime()
    };
  }
  return {
    cltStage: 'Dev not done',
    clt: undefined
  };
};

const cltStatsTooltip = (cltStats: CltStats) => {
  const { clt, cltStage } = cltStats;
  if (clt === undefined) return '';

  const prettyClt = prettyMilliseconds(clt, { compact: true, verbose: true });
  if (cltStage === 'Done') {
    return `<span class="font-bold">CLT (dev done to production):</span> <span class="text-green-500">${prettyClt}</span>`;
  }
  if (cltStage === 'Dev done') {
    return `<span class="font-bold">${cltStage}</span> <span class="text-red-300">${prettyClt}</span> ago`;
  }
};

const rowItemTooltip = (workItem: UIWorkItem) => {
  const { cltStage, clt } = cltStats(workItem);
  return `
    <div class="max-w-xs">
      <div class="pl-3" style="text-indent: -1.15rem">
        <span class="font-bold">
          <img src="${workItem.icon}" width="14" height="14" class="inline-block -mt-1" />
          ${workItem.type} #${workItem.id}:
        </span>
        ${workItem.title}
      </div>
      ${workItem.env ? (`
        <div class="mt-2">
          <span class="font-bold">Environment: </span>
          ${workItem.env}
        </div>
      `) : ''}
      <div class="mt-2">
        <span class="font-bold">Project: </span>
        ${workItem.project}
      </div>
      <div class="mt-2">
        ${cltStatsTooltip({ cltStage, clt })}
        </div>
    </div>
  `;
};

type RevisionBarProps = {
  width: number;
  revision: UIWorkItemRevision;
  nextRevision: UIWorkItemRevision;
  rowIndex: number;
  left: number;
  color: string;
};

const RevisionBar: React.FC<RevisionBarProps> = memo(({
  width, revision, nextRevision, rowIndex, left, color
}) => {
  const top = barYCoord(rowIndex);

  return (
    <g>
      <rect
        x={left}
        y={top}
        width={width}
        height={barHeight}
        fill={color}
        key={revision.date}
        data-tip={revisionTooltip(revision, nextRevision)}
        data-html
      />
      {width > 25 ? (
        <foreignObject
          x={left}
          y={top}
          width={width}
          height={barHeight}
          className="pointer-events-none"
        >
          <span
            style={{ color: contrastColour(color) }}
            className="text-xs pl-1 truncate inline-block w-full"
          >
            {revisionTitle(revision, nextRevision)}
          </span>
        </foreignObject>
      ) : null}
    </g>
  );
});

export type GanttRowProps = {
  workItem: UIWorkItem;
  isLast: boolean;
  rowIndex: number;
  indentation: number;
  expandedState: ExpandedState;
  timeToXCoord: (time: string) => number;
  onToggle: (rowPath: string) => void;
  rowPath: string;
  colorForStage: (stage: string) => string;
  revisions: 'loading' | UIWorkItemRevision[];
};

export const GanttRow: React.FC<GanttRowProps> = memo(({
  workItem, rowIndex, indentation, isLast, timeToXCoord,
  colorForStage, expandedState, onToggle, revisions, rowPath
}) => {
  const barWidth = barWidthUsing(timeToXCoord);
  const [isHighlighted, highlight] = useState<boolean>(false);

  const { cltStage } = cltStats(workItem);

  const toggle = useCallback(() => { onToggle(rowPath); }, [onToggle, rowPath]);

  const rowColor = useMemo(() => {
    const baseColor = makeTransparent(`#${workItem.color}`);
    return isHighlighted ? makeDarker(baseColor) : baseColor;
  }, [isHighlighted, workItem.color]);

  return (
    <g
      onMouseOver={() => highlight(true)}
      onMouseLeave={() => highlight(false)}
      style={{ contain: 'strict' }}
    >
      <rect
      // background
        x="0"
        y={(textHeight + (rowPadding * 2)) * rowIndex}
        width={svgWidth}
        height={textHeight}
        fill={rowColor}
      />
      {cltStage !== 'Dev not done' ? (
        <line
          x1="1"
          y1={(textHeight + (rowPadding * 2)) * rowIndex}
          x2="1"
          y2={((textHeight + (rowPadding * 2)) * rowIndex) + textHeight}
          strokeWidth="3"
          stroke={cltStage === 'Dev done' ? 'salmon' : 'limegreen'}
        />
      ) : null}
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
            onToggle={toggle}
            indentation={indentation}
          />
          <a
            href={workItem.url}
            className="link-text text truncate flex mt-1 items-center text-sm"
            style={{ width: `${textWidth}px` }}
            target="_blank"
            rel="noreferrer"
            data-tip={rowItemTooltip(workItem)}
            data-html
          >
            <img
              src={workItem.icon}
              alt={`Icon for ${workItem.type}`}
              width="16"
              className="float-left mr-1"
            />
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
          <RevisionBar
            key={revision.state + revision.date}
            width={barWidth(revisions, revisionIndex)}
            left={timeToXCoord(revision.date)}
            revision={revisions[revisionIndex]}
            nextRevision={revisions[revisionIndex + 1]}
            rowIndex={rowIndex}
            color={colorForStage(revision.state)}
          />
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
});
