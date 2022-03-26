import type { ReactNode } from 'react';
import React from 'react';

const ProjectStats: React.FC<{ note?: ReactNode }> = ({ children, note }) => (
  <div className="justify-end grid grid-flow-row">
    <div className="grid grid-flow-col relative">
      {children}
    </div>
    {note ? (
      <div className="text-xs text-gray-600 mt-1 text-right mr-2">{note}</div>
    ) : null}
  </div>
);

export default ProjectStats;
