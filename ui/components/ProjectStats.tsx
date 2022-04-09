import type { ReactNode } from 'react';
import React from 'react';

const ProjectStats: React.FC<{ note?: ReactNode; children: ReactNode }> = ({ children, note }) => (
  <div className="justify-start grid grid-flow-row mb-3">
    <div className="grid grid-flow-col relative gap-2">
      {children}
    </div>
    {note ? (
      <div className="text-xs text-gray-600 mt-1 ml-3">{note}</div>
    ) : null}
  </div>
);

export default ProjectStats;
