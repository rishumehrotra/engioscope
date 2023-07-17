import type { ReactNode } from 'react';
import React from 'react';
import { Info } from 'react-feather';

const InfoBox = ({ children }: { children: ReactNode }) => {
  return (
    <div className="bg-theme-info rounded grid grid-cols-[min-content_1fr] p-4 gap-4 items-start text-sm">
      <div>
        <Info size={20} className="text-theme-highlight" />
      </div>
      <div>{children}</div>
    </div>
  );
};

export default InfoBox;
