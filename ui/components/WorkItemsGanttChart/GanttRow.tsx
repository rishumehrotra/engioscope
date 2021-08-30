import React, {
  memo, useCallback, useMemo, useState
} from 'react';
import prettyMilliseconds from 'pretty-ms';
import type { UIWorkItemRevision } from '../../../shared/types';
import {
  textWidth, textHeight,
  rowPadding, svgWidth, makeTransparent, barYCoord,
  barHeight, contrastColour, barWidthUsing, makeDarker, barStartPadding, revisionTooltip, cltStats, rowItemTooltip
} from './helpers';
import { TreeNodeButton } from './TreeNodeButton';
import type { Row } from './use-gantt-rows';
import { isNotWorkItemRow, isWorkItemRow } from './use-gantt-rows';

const revisionTitle = (revision: UIWorkItemRevision, nextRevision: UIWorkItemRevision) => (
  <>
    <span className="font-semibold">{`${revision.state} → ${nextRevision.state}`}</span>
    {' '}
    {prettyMilliseconds(new Date(nextRevision.date).getTime() - new Date(revision.date).getTime(), { unitCount: 2 })}
  </>
);

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

type RevisionsProps = Pick<GanttRowProps, 'revisions'| 'rowIndex' | 'timeToXCoord' | 'colorForStage'>
& {'barWidth': ReturnType<typeof barWidthUsing>};

export const Revisions: React.FC<RevisionsProps> = ({
  revisions, rowIndex, barWidth, timeToXCoord, colorForStage
}) => (revisions === 'loading' ? (
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
  <>
    {revisions.slice(0, -1).map((revision, revisionIndex) => (
      <RevisionBar
        key={revision.state + revision.date}
        width={barWidth(revisions, revisionIndex)}
        left={timeToXCoord(revision.date)}
        revision={revisions[revisionIndex]}
        nextRevision={revisions[revisionIndex + 1]}
        rowIndex={rowIndex}
        color={colorForStage(revision.state)}
      />
    ))}
  </>
));

export type GanttRowProps = {
  row: Row;
  rowIndex: number;
  isLast: boolean;
  timeToXCoord: (time: string) => number;
  onToggle: (rowPath: string) => void;
  colorForStage: (stage: string) => string;
  revisions: 'loading' | UIWorkItemRevision[];
};

export const GanttRow: React.FC<GanttRowProps> = memo(({
  row, rowIndex, isLast, timeToXCoord, colorForStage, onToggle, revisions
}) => {
  const barWidth = barWidthUsing(timeToXCoord);
  const [isHighlighted, highlight] = useState<boolean>(false);

  const toggle = useCallback(
    () => { onToggle(row.path); },
    [onToggle, row.path]
  );

  const rowColor = useMemo(() => {
    if (!isWorkItemRow(row)) return '#fff';

    const baseColor = makeTransparent(`#${row.workItem.color}`);
    return isHighlighted ? makeDarker(baseColor) : baseColor;
  }, [isHighlighted, row]);

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
      {isWorkItemRow(row) && cltStats(row.workItem).cltStage !== 'Dev not done' ? (
        <line
          x1="1"
          y1={(textHeight + (rowPadding * 2)) * rowIndex}
          x2="1"
          y2={((textHeight + (rowPadding * 2)) * rowIndex) + textHeight}
          strokeWidth="3"
          stroke={cltStats(row.workItem).cltStage === 'Dev done' ? 'salmon' : 'limegreen'}
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
            expandedState={row.expandedState}
            onToggle={toggle}
            indentation={row.depth}
          />
          {isWorkItemRow(row) ? (
            <a
              href={row.workItem.url}
              className="link-text text truncate flex mt-1 items-center text-sm"
              style={{ width: `${textWidth}px` }}
              target="_blank"
              rel="noreferrer"
              data-tip={rowItemTooltip(row.workItem)}
              data-html
            >
              <img
                src={row.workItem.icon}
                alt={`Icon for ${row.workItem.type}`}
                width="16"
                className="float-left mr-1"
              />
              {row.workItem.title}
            </a>
          ) : (
            null
          )}
          {isNotWorkItemRow(row) ? `${row.label} (${row.childCount})` : null}
        </div>
      </foreignObject>
      <Revisions
        revisions={revisions}
        rowIndex={rowIndex}
        barWidth={barWidth}
        timeToXCoord={timeToXCoord}
        colorForStage={colorForStage}
      />
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
