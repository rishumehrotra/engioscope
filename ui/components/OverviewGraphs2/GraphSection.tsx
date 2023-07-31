import type { ReactNode } from 'react';
import React from 'react';

type GraphSectionProps = {
  heading: string;
  subheading: string;
  children?: ReactNode;
};

const GraphSection = ({ heading, subheading, children }: GraphSectionProps) => {
  return (
    <div>
      <h2 className="text-2xl font-medium mb-1">{heading}</h2>
      <p className="text-theme-helptext">{subheading}</p>
      {children}
    </div>
  );
};

export default GraphSection;
