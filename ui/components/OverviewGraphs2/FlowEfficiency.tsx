import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import { useGridTemplateAreas } from './GraphCard.jsx';
import useGraphArgs from './useGraphArgs.js';
import FlowEfficiencyGraphCard from './FlowEfficiencyGraphCard.jsx';

const FlowEfficiency = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getFlowEfficiencyGraph.useQuery(graphArgs, {
    keepPreviousData: true,
  });

  const projectConfig = trpc.workItems.getPageConfig.useQuery({
    queryContext: graphArgs.queryContext,
  });
  const gridTemplateAreas = useGridTemplateAreas();

  if (!graph.data?.length) return null;
  return (
    <div className="grid grid-cols-2 gap-x-10" style={{ gridTemplateAreas }}>
      {graph.data.map(wit => (
        <React.Fragment key={wit.workItemType}>
          <FlowEfficiencyGraphCard
            data={wit.data}
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
