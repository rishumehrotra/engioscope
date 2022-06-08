import type { ReactNode } from 'react';
import React from 'react';

const ProjectStats: React.FC<{ note?: ReactNode; children: ReactNode }> = ({ children, note }) => (
  <div className="justify-start grid grid-flow-row mb-8">
    <div className="flex relative gap-2 flex-wrap">
      {children}
    </div>
    {note ? (
      <div className="text-xs text-gray-600 mt-1 ml-3">{note}</div>
    ) : null}
  </div>
);

export default ProjectStats;
