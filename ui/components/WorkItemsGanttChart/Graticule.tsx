import React from 'react';
import { mediumDate } from '../../helpers/utils.js';
import {
  textWidth, barStartPadding, axisLabelsHeight, axisLabelsWidth
} from './helpers.js';

type GraticuleProps = {
  height: number;
  date: Date;
};

export const Graticule: React.FC<GraticuleProps> = ({ height, date }) => (
  <g>
    <line
      x1={textWidth + barStartPadding}
      x2={textWidth + barStartPadding}
      y1={0}
      y2={height - axisLabelsHeight}
      stroke="#ccc"
      strokeWidth="1"
      strokeDasharray="3,5"
    />
    <foreignObject
      x={textWidth + barStartPadding - (axisLabelsWidth / 2)}
      y={height - axisLabelsHeight}
      width={axisLabelsWidth}
      height={axisLabelsHeight}
    >
      <div className="text-xs text-gray-500 text-center">
        {mediumDate(date)}
      </div>
    </foreignObject>
  </g>
);
