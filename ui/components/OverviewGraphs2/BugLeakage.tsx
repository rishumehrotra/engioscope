import React from 'react';
import { twJoin } from 'tailwind-merge';
import BugGraphCard from './BugGraphCard.jsx';
import useGraphArgs from './useGraphArgs.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import BugLeakageLoader from './BugLeakageLoader.jsx';
import emptySvgPath from './empty.svg';

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
      <div
        className={twJoin(
          'rounded-xl border border-theme-seperator p-4 mt-4 mb-4',
          'bg-theme-page-content group/block',
          'self-center text-center text-sm text-theme-helptext w-full'
        )}
        style={{
          boxShadow: 'rgba(30, 41, 59, 0.05) 0px 4px 8px',
        }}
      >
        <img src={emptySvgPath} alt="No results" className="m-4 mt-6 block mx-auto" />
        <h1 className="text-base mb-2 font-medium">No Data Available</h1>
        <p>Looks like the RCA fields aren't configured.</p>
      </div>
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
