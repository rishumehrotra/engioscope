import React from 'react';

const ProjectStats: React.FC = ({ children }) => (
  <div className="justify-end flex items-center">
    <ul className="flex flex-nowrap justify-items-center">
      {children}
    </ul>
  </div>
);

export default ProjectStats;
