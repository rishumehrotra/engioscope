import React from 'react';
import { twJoin } from 'tailwind-merge';
import emptySvgPath from './empty.svg';

type GraphEmptyStateProps = {
  heading: string;
  description: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const GraphEmptyState = ({
  heading,
  description,
  className,
  style,
}: GraphEmptyStateProps) => {
  return (
    <div
      className={
        className ||
        twJoin(
          'rounded-xl border border-theme-seperator p-4 mt-4 mb-4',
          'bg-theme-page-content group/block',
          'self-center text-center text-sm text-theme-helptext w-full'
        )
      }
      style={
        style || {
          boxShadow: 'rgba(30, 41, 59, 0.05) 0px 4px 8px',
        }
      }
    >
      <img src={emptySvgPath} alt="No data" className="m-4 mt-6 block mx-auto" />
      <h1 className="text-base mb-2 font-medium">{heading}</h1>
      {description}
    </div>
  );
};
