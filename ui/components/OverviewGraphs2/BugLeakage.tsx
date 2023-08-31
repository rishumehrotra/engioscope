import React from 'react';
import BugGraphCard from './BugGraphCard.jsx';
import useGraphArgs from './useGraphArgs.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import BugLeakageLoader from './BugLeakageLoader.jsx';
import { GraphEmptyState } from './GraphEmptyState.jsx';
import type { PageSectionBlockProps } from './utils.jsx';
import useFeatureFlag from '../../hooks/use-feature-flag.js';

export type BugWorkItems = RouterClient['workItems']['getBugLeakage'];
export type Group = { rootCauseField: string; groupName: string; count: number };

const BugLeakage = ({ openDrawer }: PageSectionBlockProps) => {
  const graphArgs = useGraphArgs();
  const showConfigDrawer = useFeatureFlag('config-drawer');
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
        description={
          showConfigDrawer ? (
            <>
              You need to{' '}
              <button className="link-text" onClick={() => openDrawer()}>
                configure the root cause fields
              </button>{' '}
              for your work items.
            </>
          ) : (
            "Looks like the RCA fields aren't configured."
          )
        }
      />
    );
  }

  return graph.data.map(data => {
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
