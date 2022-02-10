import React, { useMemo } from 'react';

const yAxisLabelWidth = 0;
const barThickness = 30;
const barSpacing = 10;
// const graphWidth = 500;

const barWidth = (value: number, maxValue: number, width: number) => (
  maxValue
    ? (value / maxValue) * width
    : 0
);

type HorizontalBarGraphProps = {
  graphData: { label: string; value: number; color: string }[];
  width: number;
  onBarClick?: (x: {label: string; value: number; color: string}) => void;
  formatValue?: (value: number) => string;
  className?: string;
};

const HorizontalBarGraph: React.FC<HorizontalBarGraphProps> = ({
  graphData, width, onBarClick, formatValue, className
}) => {
  const height = useMemo(() => (graphData.length * (barThickness + barSpacing)) - barSpacing, [graphData]);
  const maxValue = useMemo(() => Math.max(...graphData.map(d => d.value)), [graphData]);
  const putLabelInBar = (value: number) => value > maxValue * 0.5;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} className={className}>
      <g>
        <line
          x1={yAxisLabelWidth}
          y1={0}
          x2={yAxisLabelWidth}
          y2={height}
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
            width={barWidth(value, maxValue, width)}
            height={barThickness}
            fill={color}
            className={onBarClick ? 'cursor-pointer' : ''}
            onClick={() => onBarClick?.({ label, value, color })}
          />
          <foreignObject
            x={putLabelInBar(value)
              ? yAxisLabelWidth
              : barWidth(value, maxValue, width) + yAxisLabelWidth}
            y={index * (barThickness + barSpacing)}
            width={putLabelInBar(value) ? barWidth(value, maxValue, width) : width - barWidth(value, maxValue, width) - yAxisLabelWidth}
            height={barThickness}
            className="pointer-events-none"
          >
            <div className={`h-full flex items-center px-2 font-semibold ${putLabelInBar(value) ? 'justify-end text-white' : ''}`}>
              {`${label} ${formatValue?.(value) || value}`}
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  );
};

export default HorizontalBarGraph;
