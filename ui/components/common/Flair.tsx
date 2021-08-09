import React from 'react';

type FlairProps = {
  colorClassName?: string;
  label: string;
  flairColor?: string;
  title?: string;
};

const Flair: React.FC<FlairProps> = ({
  colorClassName, label, flairColor, title
}) => (
  <span className="rounded-full bg-gray-200 pl-2 pr-3 py-1 text-sm mr-2" title={title}>
    <span style={{ backgroundColor: flairColor }} className={`rounded-full w-3 h-3 inline-block mr-2 ${colorClassName}`}>
      {' '}
    </span>
    {label}
  </span>
);

export default Flair;
