import type { ReactNode } from 'react';
import type React from 'react';

export type Tab = {
  title: string;
  count: number | ReactNode;
  Component: React.FC;
};
