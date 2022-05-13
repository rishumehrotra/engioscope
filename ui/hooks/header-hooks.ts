import type React from 'react';
import createContextState from '../helpers/create-context-state';
import type { GlobalUIConfig } from '../../shared/types';

type HeaderContext = Partial<{
  globalSettings: GlobalUIConfig | null;
  title: string;
  subtitle: React.ReactNode;
}>;

const [
  HeaderProvider,
  useHeaderDetails,
  useSetHeaderDetails
] = createContextState<HeaderContext>({});

export { HeaderProvider, useHeaderDetails, useSetHeaderDetails };
