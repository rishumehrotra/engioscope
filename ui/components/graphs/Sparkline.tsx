import React, { useCallback } from 'react';

type SparklineProps = {
  data: number[];
  height?: number;
  width?: number;
  lineColor?: string;
  className?: string;
};

const Sparkline: React.FC<SparklineProps> = ({
  data, height: inputHeight, width: inputWidth, lineColor: inputLineColor, className
}) => {
  const height = inputHeight || 20;
  const width = inputWidth || 20;
  const lineColor = inputLineColor || '#00bcd4';

  const spacing = width / (data.length - 1);

  const yCoord = useCallback(
    (value: number) => height - (value / Math.max(...data)) * height,
    [data, height]
  );

  return (
    <svg
      height={height}
      width={width}
      viewBox={`0 0 ${width} ${height}`}
      className={`inline-block ${className || ''}`}
    >
      <path
        d={data.map((item, itemIndex) => (
          `${itemIndex === 0 ? 'M' : 'L'} ${itemIndex * spacing} ${yCoord(item)}`
        )).join(' ')}
        stroke={lineColor}
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
};

export default Sparkline;
