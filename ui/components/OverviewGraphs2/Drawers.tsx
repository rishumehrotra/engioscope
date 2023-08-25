import React from 'react';
import { Clock } from 'react-feather';
import { trpc } from '../../helpers/trpc.js';
import type { WorkItemConfig } from './utils.jsx';
import useGraphArgs from './useGraphArgs.js';
import DrawerContents from './DrawerContents.jsx';
import { prettyMS } from '../../helpers/utils.js';
import type { DateDiffWorkItems } from '../../../backend/models/workitems2.js';

const ShowDuration = ({ workitem }: { workitem: DateDiffWorkItems }) => (
  <div className="flex items-center gap-2">
    <Clock size={16} className="text-theme-icon" />
    <span>{prettyMS(workitem.duration)}</span>
  </div>
);

type DrawerProps = {
  selectedTab: string;
  workItemConfig?: WorkItemConfig;
};

export const NewDrawer = ({ selectedTab, workItemConfig }: DrawerProps) => {
  const graphArgs = useGraphArgs();
  const newWorkItems = trpc.workItems.getNewWorkItems.useQuery(
    {
      ...graphArgs,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      workItemType: workItemConfig!.name[0],
    },
    { enabled: Boolean(workItemConfig) }
  );

  return <DrawerContents selectedTab={selectedTab} workItems={newWorkItems.data} />;
};

export const CycleTimeDrawer = ({ selectedTab, workItemConfig }: DrawerProps) => {
  const graphArgs = useGraphArgs();
  const newWorkItems = trpc.workItems.getCycleTimeWorkItems.useQuery(
    {
      ...graphArgs,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      workItemType: workItemConfig!.name[0],
    },
    { enabled: Boolean(workItemConfig) }
  );

  return (
    <DrawerContents
      selectedTab={selectedTab}
      workItems={newWorkItems.data}
      workItemDetailsRenderer={ShowDuration}
    />
  );
};

export const ChangeLeadTimeDrawer = ({ selectedTab, workItemConfig }: DrawerProps) => {
  const graphArgs = useGraphArgs();
  const newWorkItems = trpc.workItems.getChangeLeadTimeWorkItems.useQuery(
    {
      ...graphArgs,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      workItemType: workItemConfig!.name[0],
    },
    { enabled: Boolean(workItemConfig) }
  );

  return (
    <DrawerContents
      selectedTab={selectedTab}
      workItems={newWorkItems.data}
      workItemDetailsRenderer={ShowDuration}
    />
  );
};

export const WIPTrendDrawer = ({ selectedTab, workItemConfig }: DrawerProps) => {
  const graphArgs = useGraphArgs();
  const wipTrendItems = trpc.workItems.getWipTrendOnDateWorkItems.useQuery(
    {
      ...graphArgs,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      workItemType: workItemConfig!.name[0],
      date: graphArgs.queryContext[3],
    },
    { enabled: Boolean(workItemConfig) }
  );
  return <DrawerContents selectedTab={selectedTab} workItems={wipTrendItems.data} />;
};
