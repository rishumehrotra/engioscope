import React, { useMemo } from 'react';

type ExpandableBarGraphProps = {
  data: {
    key: string;
    heading: React.ReactNode;
    value: number;
    children: React.ReactNode;
    barColor: string;
  }[];
};

const ExpandableBarGraph: React.FC<ExpandableBarGraphProps> = ({ data }) => {
  const max = useMemo(
    () => Math.max(...data.map(d => d.value)),
    [data]
  );

  return (
    <ul>
      {data.map(({
        heading, value, children, barColor, key
      }) => (
        <li key={key}>
          <details className="mb-2">
            <summary>
              <div
                style={{ width: 'calc(100% - 20px)' }}
                className="inline-block relative"
              >
                <div
                  style={{
                    width: `${(value / max) * 100}%`,
                    backgroundColor: barColor
                  }}
                  className="absolute top-0 left-0 h-full rounded-md"
                />
                <h3
                  className="z-10 relative text-lg pl-2 py-1"
                >
                  {heading}
                </h3>
              </div>
            </summary>
            <div className="pl-6">
              {children}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
};

export default ExpandableBarGraph;
