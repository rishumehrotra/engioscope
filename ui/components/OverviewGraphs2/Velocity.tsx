import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, useGridTemplateAreas } from './GraphCard.jsx';
import { prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';
import GraphAreaLoader from './GraphAreaLoader.jsx';

const Velocity = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getVelocityGraph.useQuery(graphArgs, {
    keepPreviousData: true,
  });
  const graphWithConfig = useDecorateForGraph(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  return (
    <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
      {graphWithConfig ? (
        graphWithConfig.map(({ config, graphCardProps }) => {
          if (!config) return null;
          return (
            <GraphCard
              {...graphCardProps({
                graphName: 'Velocity',
                drawerComponentName: 'VelocityDrawer',
              })}
              subheading={[
                'A',
                config.name[0].toLowerCase(),
                'is considered closed if it reached',
                prettyStates(config.endStates),
              ].join(' ')}
            />
          );
        })
      ) : (
        <GraphAreaLoader />
      )}
    </div>
  );
};

export default Velocity;
