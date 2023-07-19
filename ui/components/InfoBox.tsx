import type { ReactNode } from 'react';
import React from 'react';
import { Info } from 'react-feather';
import { twMerge } from 'tailwind-merge';

const InfoBox = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={twMerge(
        'bg-theme-info rounded grid grid-cols-[min-content_1fr] p-4 gap-4 items-start text-sm',
        className
      )}
    >
      <div>
        <Info size={20} className="text-theme-highlight" />
      </div>
      <div>{children}</div>
    </div>
  );
};

export default InfoBox;
