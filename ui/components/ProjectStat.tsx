import React from 'react';

type Stat = {
  title: string;
  value: string;
  tooltip?: string;
};

export type ProjectStatProps = {
  topStats: Stat[];
  childStats?: Stat[];
};

const ProjectStat: React.FC<ProjectStatProps> = ({
  topStats, childStats
}) => (
  <li className="p-2 border border-gray-200 bg-white shadow-sm ml-1 rounded flex">
    {topStats ? topStats.map(({ title, value, tooltip }) => (
      <div
        key={`${title}-${value}`}
        data-tip={tooltip}
        data-html
        className={`mx-2 flex flex-col justify-end ${childStats ? 'mr-4' : ''}`}
      >
        <h3 className="text-xs font-medium">{title}</h3>
        <div className="font-bold text-2xl">
          {value}
        </div>
      </div>
    )) : null}

    {childStats ? childStats.map(({ title, value, tooltip }) => (
      <div
        data-tip={tooltip}
        data-html
        key={`${title}-${value}`}
        className="mx-2 flex flex-col h-full justify-end"
      >
        <h3 className="text-xs">{title}</h3>
        <div className="font-bold leading-7">
          {value}
        </div>
      </div>
    )) : null}
  </li>
);

export default ProjectStat;
