import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, useGridTemplateAreas } from './GraphCard.jsx';
import { prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';

const CycleTime = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getCycleTimeGraph.useQuery(graphArgs, {
    keepPreviousData: true,
  });
  const graphWithConfig = useDecorateForGraph(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  return (
    <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
      {graphWithConfig?.map(({ config, graphCardProps }) => {
        if (!config) return null;
        return (
          <GraphCard
            {...graphCardProps({
              graphName: 'Cycle time',
              drawerComponentName: 'CycleTimeDrawer',
            })}
            subheading={[
              'Cycle time for',
              config.name[0].toLowerCase(),
              'is computed from',
              prettyStates(config.startStates),
              'to',
              prettyStates(config.endStates),
            ].join(' ')}
            popup="time-spent-completed"
          />
        );
      })}
    </div>
  );
};

export default CycleTime;
