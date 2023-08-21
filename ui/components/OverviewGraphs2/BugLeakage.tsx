import React from 'react';
import BugGraphCard from './BugGraphCard.jsx';
import useGraphArgs from './useGraphArgs.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';

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

  return graph.data?.map(data => {
    return (
      <BugGraphCard
        key={data.type}
        workItemConfig={projectConfig.data?.workItemsConfig?.find(
          wic => wic.name[0] === data.type
        )}
        data={data.data}
        drawer={(groupName: string) => ({
          heading: groupName,
          children: 'Loading...',
        })}
      />
    );
  });
};

export default BugLeakage;
