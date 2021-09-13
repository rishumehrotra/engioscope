import React, { useMemo } from 'react';

const yAxisLabelWidth = 0;
const xAxisHeight = 50;
const barThickness = 30;
const barSpacing = 10;
const graphWidth = 500;

const barWidth = (value: number, maxValue: number) => (
  maxValue
    ? (value / maxValue) * graphWidth
    : 0
);

type HorizontalBarGraphProps = {
  graphData: { label: string; value: number; color: string }[];
  width: number;
};

const HorizontalBarGraph: React.FC<HorizontalBarGraphProps> = ({ graphData, width }) => {
  const height = useMemo(() => graphData.length * (barThickness + barSpacing), [graphData]);
  const maxValue = useMemo(() => Math.max(...graphData.map(d => d.value)), [graphData]);
  const putLabelInBar = (value: number) => value > maxValue * 0.5;

  return (
    <svg viewBox={`0 0 ${graphWidth} ${height}`} width={width}>
      <g>
        <line
          x1={yAxisLabelWidth}
          y1={0}
          x2={yAxisLabelWidth}
          y2={height - xAxisHeight}
          stroke="#ddd"
          strokeWidth="1"
        />
      </g>
      {graphData.map(({ label, value, color }, index) => (
        <g key={label}>
          <rect
            key={label}
            x={yAxisLabelWidth}
            y={index * (barThickness + barSpacing)}
            width={barWidth(value, maxValue)}
            height={barThickness}
            fill={color}
          />
          <foreignObject
            x={putLabelInBar(value)
              ? yAxisLabelWidth
              : barWidth(value, maxValue) + yAxisLabelWidth}
            y={index * (barThickness + barSpacing)}
            width={putLabelInBar(value) ? barWidth(value, maxValue) : width - barWidth(value, maxValue) - yAxisLabelWidth}
            height={barThickness}
          >
            <div className={`h-full flex items-center px-2 font-semibold ${putLabelInBar(value) ? 'justify-end text-white' : ''}`}>
              {`${label} ${value}`}
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  );
};

export default HorizontalBarGraph;
