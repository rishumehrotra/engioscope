import type { ReactNode } from 'react';
import React from 'react';

type PageSectionProps = {
  heading: string;
  subheading: string;
  children?: ReactNode;
};

const PageSection = ({ heading, subheading, children }: PageSectionProps) => {
  return (
    <section>
      <h2 className="text-2xl font-medium mb-1">{heading}</h2>
      <p className="text-theme-helptext">{subheading}</p>
      {children}
    </section>
  );
};

export default PageSection;
