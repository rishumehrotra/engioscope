import React, { useMemo } from 'react';
import { range } from 'rambda';
import { twJoin } from 'tailwind-merge';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import useGraphArgs from './useGraphArgs.js';
import FlowEfficiencyGraphCard from './FlowEfficiencyGraphCard.jsx';
import FlowEfficiencyLoader from './FlowEfficiencyLoader.jsx';
import emptySvgPath from './empty.svg';

const FlowEfficiency = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getFlowEfficiencyGraph.useQuery(graphArgs, {
    keepPreviousData: true,
  });

  const projectConfig = trpc.workItems.getPageConfig.useQuery({
    queryContext: graphArgs.queryContext,
  });

  const gridTemplateAreas = useMemo(() => {
    if (!projectConfig.data?.workItemsConfig) return;

    const rowCount = Math.ceil(projectConfig.data.workItemsConfig.length / 2);

    const graphGrid = range(0, rowCount).reduce<
      [SingleWorkItemConfig | undefined, SingleWorkItemConfig | undefined][]
    >((acc, rowIndex) => {
      acc.push([
        projectConfig.data.workItemsConfig?.[2 * rowIndex],
        projectConfig.data.workItemsConfig?.[2 * rowIndex + 1],
      ]);
      return acc;
    }, []);

    return graphGrid
      ?.reduce<string[]>((acc, configs, index) => {
        acc.push(
          `"graph${2 * index} graph${2 * index + 1}"`,
          `"graphFooter${2 * index} graphFooter${2 * index + 1}"`
        );
        return acc;
      }, [])
      .join(' ');
  }, [projectConfig.data?.workItemsConfig]);

  if (!graph.data) return <FlowEfficiencyLoader />;

  if (!graph.data?.length) {
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
        <p> Your work centers are not configured. </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-10" style={{ gridTemplateAreas }}>
      {graph.data.map((wit, index) => (
        <React.Fragment key={wit.workItemType}>
          <FlowEfficiencyGraphCard
            data={wit.data}
            index={index}
            workItemConfig={projectConfig.data?.workItemsConfig?.find(
              wic => wic.name[0] === wit.workItemType
            )}
          />
        </React.Fragment>
      ))}
    </div>
  );
};

export default FlowEfficiency;
