import React, { useMemo } from 'react';
import Loading from '../Loading';

const yAxisItemSpacing = 35;
const yAxisLeftPadding = 20;
const height = 500;
const xAxisBottomPadding = 20;
const axisOverhang = 5;

const getLinePaths = <T, U>(
  graphData: AreaGraphProps<T, U>['graphData'],
  pointToValue: AreaGraphProps<T, U>['pointToValue']
) => (
  graphData[0]
    ? (
      graphData[0].points.reduce<number[][]>((acc, _, yPointIndex) => {
        acc.push(graphData.map(({ points }, xPointIndex) => (
          pointToValue(points[yPointIndex]) + acc[acc.length - 1][xPointIndex]
        )));
        return acc;
      }, [graphData.map(() => 0)])
    )
    : null
);

const Axes: React.FC<{ width: number }> = ({ width }) => (
  <g>
    <line
      x1={yAxisLeftPadding}
      y1={0}
      x2={yAxisLeftPadding}
      y2={height - xAxisBottomPadding + axisOverhang}
      stroke="#ddd"
      strokeWidth={1}
    />
    <line
      x1={yAxisLeftPadding - axisOverhang}
      y1={height - xAxisBottomPadding}
      x2={width - yAxisLeftPadding + axisOverhang}
      y2={height - xAxisBottomPadding}
      stroke="#ddd"
      strokeWidth={1}
    />
  </g>
);

type AreaGraphProps<X, Y> = {
  graphData: {
    yAxisValue: X;
    points: Y[];
  }[];
  className?: string;
  pointToValue: (point: Y) => number;
};

const AreaGraph = <T, U>({
  graphData, pointToValue, className
}: AreaGraphProps<T, U>): React.ReactElement => {
  const width = (graphData.length - 1) * yAxisItemSpacing;
  const lines = useMemo(
    () => getLinePaths(graphData, pointToValue),
    [graphData, pointToValue]
  );
  const maxValue = lines && Math.max(...lines.flat());

  if (!maxValue) return <Loading />;

  const xCoord = (index: number) => (
    (index * yAxisItemSpacing) + yAxisLeftPadding
  );
  const yCoord = (value: number) => (
    height - (value / maxValue) * (height - xAxisBottomPadding)
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className}>
      <Axes width={width} />
      {lines?.slice(1).map((line, lineIndex) => (
        <path
          // eslint-disable-next-line react/no-array-index-key
          key={lineIndex}
          d={[
            `M ${xCoord(0)} ${yCoord(lines[lineIndex][0])}`,
            ...line.map((value, valueIndex) => `L ${xCoord(valueIndex)} ${yCoord(value)}`)
          ].join(' ')}
        />
      ))}
    </svg>
  );
};

export default AreaGraph;
