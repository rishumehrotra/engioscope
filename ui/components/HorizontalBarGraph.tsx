import React from 'react';

type HorizontalBarGraphProps = {
  graphData: { label: string; value: number }[];
};

const HorizontalBarGraph: React.FC<HorizontalBarGraphProps> = ({ graphData }) => {
  console.log(graphData);

  return (
    <svg viewBox="0 0 100 300">
      <g />
    </svg>
  );
};

export default HorizontalBarGraph;
