import React, { createContext, useContext, useState } from 'react';
import { UIProjectAnalysis } from '../../shared/types';

type ProjectAnalysisType = UIProjectAnalysis | null;
type ProjectDetailsContextType = [
  ProjectAnalysisType,
  (x: ProjectAnalysisType) => void
];
const ProjectDetailsContext = createContext<ProjectDetailsContextType>([null, () => undefined]);

export const ProjectDetailsProvider: React.FC = ({ children }) => {
  const state = useState<ProjectAnalysisType>(null);

  return (
    <ProjectDetailsContext.Provider value={state}>
      {children}
    </ProjectDetailsContext.Provider>
  );
};

export const useProjectDetails = () => useContext(ProjectDetailsContext)[0];
export const useSetProjectDetails = () => useContext(ProjectDetailsContext)[1];
