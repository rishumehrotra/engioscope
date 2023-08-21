import React from 'react';
import PageSection from './PageSection.jsx';
import BugGraphCard from './BugGraphCard.jsx';
import useGraphArgs from './useGraphArgs.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';

export type BugWorkItems = RouterClient['workItems']['getBugLeakage'];
export type Group = { rootCauseField: string; groupName: string; count: number };

const BugLeakage = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getBugLeakage.useQuery(graphArgs);
  const projectConfig = trpc.workItems.getPageConfig.useQuery({
    queryContext: graphArgs.queryContext,
  });

  return (
    <PageSection
      heading="Bug leakage with root cause"
      subheading="Bugs leaked over the last 84 days with their root cause"
    >
      {graph.data?.map(data => {
        return (
          <BugGraphCard
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
      })}
    </PageSection>
  );
};

export default BugLeakage;
