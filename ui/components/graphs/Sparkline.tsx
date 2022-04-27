import { add, range } from 'rambda';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { shortDate } from '../../helpers/utils';
import useHover from '../../hooks/use-hover';

const popoverSvgConfig = {
  width: 250,
  height: 150,
  yAxisLabelHeight: 15,
  yAxisLabelWidth: 40,
  xAxisLabelHeight: 20,
  xAxisOverhang: 0,
  yAxisOverhang: 0,
  horizontalGridLineCount: 4,
  verticalGridLineCount: 4,
  topPadding: 5
};

const exaggerateTrendLine = (data: number[]) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const diff = max - min;

  const exaggerated = data.map(val => val - (max - diff) + (diff * 1));

  return exaggerated;
};

const computeLineGraphData = (
  config: typeof popoverSvgConfig,
  data: number[]
) => {
  const maxValue = Math.max(...data);
  const popoverSpacing = config.width / (data.length - 1);
  const xAxisYLocation = config.height + config.yAxisOverhang + config.topPadding;
  const yAxisXLocation = config.yAxisLabelWidth;
  const gridLinesGap = Math.ceil(maxValue / (config.horizontalGridLineCount + 1));
  const popoverXCoord = (index: number) => (
    (index * popoverSpacing)
    + config.yAxisLabelWidth
  );
  const popoverYCoord = (value: number) => (
    config.height
    - ((value / maxValue) * config.height)
    + config.yAxisOverhang
    + config.topPadding
  );

  return {
    svgHeight: config.height + config.yAxisOverhang + config.xAxisLabelHeight + config.topPadding,
    svgWidth: config.width + config.yAxisLabelWidth + config.xAxisOverhang,
    xAxisCoords: {
      x1: config.yAxisLabelWidth - config.xAxisOverhang,
      y1: xAxisYLocation,
      x2: config.yAxisLabelWidth + config.width + config.xAxisOverhang,
      y2: xAxisYLocation
    },
    yAxisCoords: {
      x1: yAxisXLocation,
      y1: config.topPadding,
      x2: yAxisXLocation,
      y2: config.height + (config.yAxisOverhang * 2) + config.topPadding
    },
    horizontalGridLines: range(1, config.horizontalGridLineCount + 1).map(gridLineIndex => ({
      label: gridLineIndex * gridLinesGap,
      lineCoords: {
        x1: config.yAxisLabelWidth,
        y1: popoverYCoord(gridLineIndex * gridLinesGap),
        x2: config.width + config.yAxisLabelWidth,
        y2: popoverYCoord(gridLineIndex * gridLinesGap)
      },
      labelCoords: {
        x: 0,
        y: popoverYCoord(gridLineIndex * gridLinesGap) - (config.yAxisLabelHeight / 2) + config.topPadding,
        width: config.yAxisLabelWidth,
        height: config.yAxisLabelHeight
      }
    })),
    verticalGridLines: range(1, config.verticalGridLineCount + 1)
      .map(gridLineIndex => ({
        lineCoords: {
          x1: popoverXCoord(Math.round(gridLineIndex * (data.length / (config.verticalGridLineCount)))),
          y1: config.topPadding,
          x2: popoverXCoord(Math.round(gridLineIndex * (data.length / (config.verticalGridLineCount)))),
          y2: config.topPadding + config.height + config.yAxisOverhang
        },
        labelCoords: {
          x: popoverXCoord(Math.round(gridLineIndex * (data.length / (config.verticalGridLineCount))))
            - (config.width / (config.verticalGridLineCount + 1) / 2),
          y: config.topPadding + config.height,
          width: config.width / (config.verticalGridLineCount + 1),
          height: config.xAxisLabelHeight
        },
        label: (() => {
          const numWeeks = data.length;
          const weeksPerPart = numWeeks / config.verticalGridLineCount;
          const weekIndex = numWeeks - (weeksPerPart * gridLineIndex) - 1;
          const date = new Date();
          date.setDate(date.getDate() - (weekIndex * 7));
          return shortDate(date);
          // return gridLineIndex;
        })()
      })),
    linePath: data.map((item, itemIndex) => (
      `${itemIndex === 0 ? 'M' : 'L'} ${popoverXCoord(itemIndex)} ${popoverYCoord(item)}`
    )).join(' ')
  };
};

type PopoverSvgProps = {
  lineColor?: string;
  data: number[];
  yAxisLabel: (index: number) => string;
};

const PopoverSvg: React.FC<PopoverSvgProps> = ({ lineColor, data, yAxisLabel }) => {
  const lineGraph = useMemo(() => computeLineGraphData(popoverSvgConfig, data), [data]);

  return (
    <svg
      height={lineGraph.svgHeight}
      width={lineGraph.svgWidth}
      viewBox={`0 0 ${lineGraph.svgWidth} ${lineGraph.svgHeight}`}
      className="inline-block"
    >
      <line
        {...lineGraph.yAxisCoords}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={1}
      />

      <line
        {...lineGraph.xAxisCoords}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={1}
      />

      {lineGraph.horizontalGridLines.map(({ label, lineCoords, labelCoords }) => (
        <g key={label}>
          <line {...lineCoords} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          <foreignObject {...labelCoords}>
            <div className="text-xs text-gray-300 text-right pr-2">
              {yAxisLabel(label)}
            </div>
          </foreignObject>
        </g>
      ))}

      {lineGraph.verticalGridLines.map(({ label, lineCoords, labelCoords }) => (
        <g key={label}>
          <line {...lineCoords} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          <foreignObject {...labelCoords}>
            <div className="text-xs text-gray-300 text-center">
              {label}
            </div>
          </foreignObject>
        </g>
      ))}

      <path
        d={lineGraph.linePath}
        stroke={lineColor}
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
};

type SparklineProps = {
  data: number[];
  height?: number;
  width?: number;
  lineColor?: string;
  className?: string;
  yAxisLabel?: (index: number) => string;
};

const Sparkline: React.FC<SparklineProps> = ({
  data, height: inputHeight, width: inputWidth, lineColor: inputLineColor, className,
  yAxisLabel: inputYAxisLabel
}) => {
  const height = inputHeight || 20;
  const width = inputWidth || 20;
  const lineColor = inputLineColor || '#00bcd4';
  const lineStrokeWidth = 1.25;

  const spacing = width / (data.length - 1);

  const [ref, isHovering] = useHover();

  const path = useMemo(
    () => {
      const dataForSparkline = exaggerateTrendLine(data);
      const maxData = Math.max(...dataForSparkline);
      const addOffset = dataForSparkline.every(item => item === maxData);

      const maxDataToRender = addOffset ? maxData + 3 : maxData;

      return dataForSparkline
        .map(add(addOffset ? 2 : 0))
        .map((value, index) => {
          const yCoord = height - lineStrokeWidth - ((value / maxDataToRender) * (height - lineStrokeWidth));
          return `${index === 0 ? 'M' : 'L'} ${index * spacing} ${yCoord}`;
        })
        .join(' ');
    },
    [data, height, spacing]
  );

  const yAxisLabel = useMemo(() => inputYAxisLabel || String, [inputYAxisLabel]);

  if (data.every(point => point === 0)) return null;

  return (
    <span className="relative group inline-block" ref={ref}>
      <span className={`rounded-t-md inline-block ml-1 px-2 ${
        isHovering ? 'group-hover:bg-slate-800 group-hover:shadow-md' : ''
      }`}
      >
        <svg
          height={height}
          width={width}
          viewBox={`0 0 ${width} ${height}`}
          className={`inline-block -mb-1 ${className || ''}`}
        >
          <path
            d={path}
            stroke={lineColor}
            strokeWidth={lineStrokeWidth}
            fill="none"
          />
        </svg>
      </span>

      {isHovering
        ? (
          <span
            className="absolute hidden group-hover:block bg-slate-800 rounded-2xl pb-2 pt-6 pl-4 pr-6 z-50 shadow-2xl"
            style={{ marginLeft: `-${(popoverSvgConfig.width / 2) + 18}px` }}
          >
            <PopoverSvg lineColor={lineColor} data={data} yAxisLabel={yAxisLabel} />
          </span>
        )
        : null}
    </span>
  );
};

export default Sparkline;

const LabelWithSparkline: React.FC<{ label: ReactNode } & SparklineProps> = ({
  label, ...sparklineProps
}) => (
  <span className="inline-flex items-end gap-x-0.5">
    <span>{label}</span>
    <Sparkline {...sparklineProps} />
  </span>
);

export { LabelWithSparkline };
