import React from 'react';
import BugGraphCard from './BugGraphCard.jsx';
import useGraphArgs from './useGraphArgs.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import BugLeakageLoader from './BugLeakageLoader.jsx';
import { GraphEmptyState } from './GraphEmptyState.jsx';

export type BugWorkItems = RouterClient['workItems']['getBugLeakage'];
export type Group = { rootCauseField: string; groupName: string; count: number };

const BugLeakage = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getBugLeakage.useQuery(graphArgs, {
    keepPreviousData: true,
  });
  const projectConfig = trpc.workItems.getPageConfig.useQuery({
    queryContext: graphArgs.queryContext,
  });

  if (!graph.data || !projectConfig.data) return <BugLeakageLoader />;

  if (!graph.data.length) {
    return (
      <GraphEmptyState
        heading="No data available"
        description="Looks like the RCA fields aren't configured."
      />
    );
  }

  return graph.data?.map(data => {
    return (
      <BugGraphCard
        key={data.type}
        workItemConfig={projectConfig.data?.workItemsConfig?.find(
          wic => wic.name[0] === data.type
        )}
        data={data.data}
      />
    );
  });
};

export default BugLeakage;
