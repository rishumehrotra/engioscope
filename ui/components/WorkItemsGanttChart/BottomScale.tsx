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
};

const BottomScale: React.FC<BottomScaleProps> = ({ count, minDate, maxDate }) => (
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
      x={textWidth + barStartPadding - 50}
      y={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight + 5}
      width={axisLabelsWidth}
      height={axisLabelsHeight}
    >
      <div className="text-xs text-gray-500 text-center">
        {mediumDate(minDate)}
      </div>
    </foreignObject>
    <foreignObject
      x={svgWidth - axisLabelsWidth}
      y={(textHeight + (rowPadding * 2)) * count + bottomScaleHeight + 5}
      width={axisLabelsWidth}
      height={axisLabelsHeight}
    >
      <div className="text-xs text-gray-500 text-center">
        {mediumDate(maxDate)}
      </div>
    </foreignObject>
  </g>
);

export default BottomScale;
