import React from 'react';
import { mediumDate } from '../../helpers/utils';
import {
  axisLabelsHeight,
  axisLabelsWidth,
  barStartPadding, bottomScaleHeight, rowPadding, svgWidth, textHeight, textWidth
} from './helpers';

type DragHandleProps = {
  onSelect: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  x: number;
  y: number;
  lowerDate: Date;
  upperDate: Date;
};

const DragHandle: React.FC<DragHandleProps> = ({
  onSelect, x, y, lowerDate, upperDate
}) => (
  <foreignObject
    x={x}
    y={y}
    width={axisLabelsWidth}
    height={axisLabelsHeight}
  >
    <button
      onClick={() => onSelect([new Date(lowerDate.getTime() + 2000000000).getTime(), new Date(upperDate.getTime() - 2000000000).getTime()])}
      className="cursor-pointer"
    >
      <svg height="24" viewBox="0 0 24 24" width="24">
        <path d="M0 0h24v24H0V0z" fill="none" />
        {/* eslint-disable-next-line max-len */}
        <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
      </svg>
    </button>
  </foreignObject>
);

type BottomScaleProps = {
  count: number;
  lowerDate: Date;
  upperDate: Date;
  initialMinDate: Date;
  initialMaxDate: Date;
  onSelect: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  timeToXCoord: (date: Date) => number;
};

const BottomScale: React.FC<BottomScaleProps> = ({
  count, lowerDate, upperDate, onSelect, initialMinDate, initialMaxDate
}) => (
  <g>
    <line
      x1={textWidth + barStartPadding}
      y1={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight}
      x2={svgWidth}
      y2={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight}
      stroke="#ccc"
      strokeWidth="1"
    />
    <div
      className="text-xs text-gray-500 text-center"
    >
      {mediumDate(initialMinDate)}
    </div>
    <DragHandle
      x={textWidth + barStartPadding - 8}
      y={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight - 25}
      onSelect={onSelect}
      lowerDate={lowerDate}
      upperDate={upperDate}
    />
    <div className="text-xs text-gray-500 text-center">
      {mediumDate(initialMaxDate)}
    </div>
    <DragHandle
      x={svgWidth - 18}
      y={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight - 25}
      onSelect={onSelect}
      lowerDate={lowerDate}
      upperDate={upperDate}
    />
  </g>
);

export default BottomScale;
