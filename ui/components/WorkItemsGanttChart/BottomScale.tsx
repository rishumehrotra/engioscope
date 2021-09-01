import React from 'react';
import { mediumDate } from '../../helpers/utils';
import {
  axisLabelsHeight,
  axisLabelsWidth,
  barStartPadding, bottomScaleHeight, rowPadding, svgWidth, textHeight, textWidth
} from './helpers';

type BottomScaleProps = {
  count: number;
  minDate: Date;
  maxDate: Date;
  initialMinDate: Date;
  initialMaxDate: Date;
  onSelect: React.Dispatch<React.SetStateAction<[number, number] | null>>;
};

const DragHandle = () => (
  <svg height="24" viewBox="0 0 24 24" width="24">
    <path d="M0 0h24v24H0V0z" fill="none" />
    {/* eslint-disable-next-line max-len */}
    <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);

const BottomScale: React.FC<BottomScaleProps> = ({
  count, minDate, maxDate, onSelect, initialMinDate, initialMaxDate
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
    <foreignObject
      x={textWidth + barStartPadding - 8}
      y={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight - 25}
      width={axisLabelsWidth}
      height={axisLabelsHeight}
    >
      <button
        onClick={() => onSelect([new Date(minDate.getTime() + 2000000000).getTime(), maxDate.getTime()])}
        className="cursor-pointer"
      >
        <DragHandle />
      </button>
      <div
        className="text-xs text-gray-500 text-center"
      >
        {mediumDate(initialMinDate)}
      </div>
    </foreignObject>

    <foreignObject
      x={svgWidth - 18}
      y={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight - 25}
      width={axisLabelsWidth}
      height={axisLabelsHeight}
    >
      <button
        onClick={() => onSelect([minDate.getTime(), new Date(maxDate.getTime() - 2000000000).getTime()])}
        className="cursor-pointer"
      >
        <DragHandle />
      </button>
      <div className="text-xs text-gray-500 text-center">
        {mediumDate(initialMaxDate)}
      </div>
    </foreignObject>
  </g>
);

export default BottomScale;
