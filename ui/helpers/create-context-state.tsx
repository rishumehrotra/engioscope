import React, { createContext, useContext, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
const createContextState = <ValueType extends unknown>(defaultValue: ValueType) => {
  type ContextType = [ValueType, (x: ValueType) => void];
  // eslint-disable-next-line unicorn/no-useless-undefined
  const ProjectDetailsContext = createContext<ContextType>([defaultValue, () => undefined]);

  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
