import React, { createContext, useContext, useState } from 'react';

const createContextState = <ValueType, >(defaultValue: ValueType) => {
  type ContextType = [ValueType, (x: ValueType) => void];
  const ProjectDetailsContext = createContext<ContextType>([defaultValue, () => undefined]);

  const Provider: React.FC = ({ children }) => {
    const state = useState<ValueType>(defaultValue);

    return (
      <ProjectDetailsContext.Provider value={state}>
        {children}
      </ProjectDetailsContext.Provider>
    );
  };

  const useValue = () => useContext(ProjectDetailsContext)[0];
  const useSetValue = () => useContext(ProjectDetailsContext)[1];

  return [Provider, useValue, useSetValue] as const;
};

export default createContextState;
