import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import type { WorkItemConfig } from './utils.jsx';
import useGraphArgs from './useGraphArgs.js';
import DrawerContents from './DrawerContents.jsx';

type DrawerProps = {
  selectedTab: string;
  workItemConfig: WorkItemConfig;
};

export const NewDrawer = ({ selectedTab, workItemConfig }: DrawerProps) => {
  const graphArgs = useGraphArgs();
  const newWorkItems = trpc.workItems.getNewWorkItems.useQuery({
    ...graphArgs,
    workItemType: workItemConfig.name[0],
  });

  return <DrawerContents selectedTab={selectedTab} workItems={newWorkItems.data} />;
};

export const VelocityDrawer = ({ selectedTab, workItemConfig }: DrawerProps) => {
  const graphArgs = useGraphArgs();
  const newWorkItems = trpc.workItems.getVelocityWorkItems.useQuery({
    ...graphArgs,
    workItemType: workItemConfig.name[0],
  });

  return <DrawerContents selectedTab={selectedTab} workItems={newWorkItems.data} />;
};

export const CycleTimeDrawer = ({ selectedTab, workItemConfig }: DrawerProps) => {
  const graphArgs = useGraphArgs();
  const newWorkItems = trpc.workItems.getCycleTimeWorkItems.useQuery({
    ...graphArgs,
    workItemType: workItemConfig.name[0],
  });

  return <DrawerContents selectedTab={selectedTab} workItems={newWorkItems.data} />;
};

export const ChangeLeadTimeDrawer = ({ selectedTab, workItemConfig }: DrawerProps) => {
  const graphArgs = useGraphArgs();
  const newWorkItems = trpc.workItems.getChangeLeadTimeWorkItems.useQuery({
    ...graphArgs,
    workItemType: workItemConfig.name[0],
  });

  return <DrawerContents selectedTab={selectedTab} workItems={newWorkItems.data} />;
};

export const WIPTrendDrawer = ({ selectedTab, workItemConfig }: DrawerProps) => {
  const graphArgs = useGraphArgs();
  const wipTrendItems = trpc.workItems.getWipTrendOnDateWorkItems.useQuery({
    ...graphArgs,
    workItemType: workItemConfig.name[0],
    date: graphArgs.queryContext[3],
  });
  return <DrawerContents selectedTab={selectedTab} workItems={wipTrendItems.data} />;
};
