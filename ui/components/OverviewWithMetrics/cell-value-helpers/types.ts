import type { ReactNode } from 'react';
import type React from 'react';
import type { SingleWorkItemConfig } from '../../../helpers/trpc.js';

export type DrawerPropsSetter = (
  value: React.SetStateAction<{
    heading: ReactNode;
    children: ReactNode;
    downloadUrl?: string | undefined;
  }>
) => void;

export type CellHelper = (
  config: SingleWorkItemConfig,
  setDrawerProps: DrawerPropsSetter,
  openDrawer: () => void
) => {
  value: string;
  color: {
    line: string;
    area: string;
  };
  graphData: number[];
  onClick: () => void;
};

export type DataSeries<T> =
  | {
      data: T[];
      workItemType: string;
    }[]
  | undefined;
