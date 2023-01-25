import React from 'react';

type GanttBarProps = {
  maxTime: number;
  stages: { label: string; time: number; color: string }[];
  tooltip: string;
  className?: string;
};

export const GanttBar: React.FC<GanttBarProps> = ({
  maxTime,
  stages,
  tooltip,
  className,
}) => (
  <ul
    data-tip={tooltip}
    data-html
    className={`flex gap-0.5 text-xs font-semibold ${className || ''}`}
    style={{
      flex: `0 0 ${maxTime}px`,
    }}
  >
    {stages.map(({ label, time, color }) => (
      <li
        key={label}
        className="inline-block overflow-hidden whitespace-nowrap overflow-ellipsis text-gray-700 py-0.5 px-1 rounded"
        style={{ width: `${(time / maxTime) * 100}%`, backgroundColor: color }}
      >
        {label}
      </li>
    ))}
  </ul>
);
