import React, { useMemo } from 'react';
import { range } from 'rambda';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import useGraphArgs from './useGraphArgs.js';
import FlowEfficiencyGraphCard from './FlowEfficiencyGraphCard.jsx';
import FlowEfficiencyLoader from './FlowEfficiencyLoader.jsx';
import { GraphEmptyState } from './GraphEmptyState.jsx';
import type { PageSectionBlockProps } from './utils.jsx';
import useFeatureFlag from '../../hooks/use-feature-flag.js';

const FlowEfficiency = ({ openDrawer }: PageSectionBlockProps) => {
  const graphArgs = useGraphArgs();
  const showConfigDrawer = useFeatureFlag('config-drawer');
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
      <GraphEmptyState
        heading="No data available"
        description={
          showConfigDrawer ? (
            <>
              <button className="link-text" onClick={() => openDrawer()}>
                Configure
              </button>{' '}
              your work centers.
            </>
          ) : (
            "Looks like the work centers aren't configured."
          )
        }
      />
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
