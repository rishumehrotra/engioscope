import type React from 'react';
import createContextState from '../helpers/create-context-state.js';

type HeaderContext = Partial<{
  title: string;
  subtitle: React.ReactNode;
  lastUpdated: string;
}>;

const [
  HeaderProvider,
  useHeaderDetails,
  useSetHeaderDetails
] = createContextState<HeaderContext>({});

export { HeaderProvider, useHeaderDetails, useSetHeaderDetails };
