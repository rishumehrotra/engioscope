import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, useGridTemplateAreas } from './GraphCard.jsx';
import { prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';

const New = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getNewGraph.useQuery(graphArgs, {
    keepPreviousData: true,
  });
  const graphWithConfig = useDecorateForGraph(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  console.log(graph.data, graphWithConfig);

  return (
    <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
      {graphWithConfig?.map(({ config, graphCardProps }) => {
        if (!config) return null;

        return (
          <GraphCard
            {...graphCardProps({
              graphName: 'New work items',
              drawerComponentName: 'NewDrawer',
            })}
            subheading={[
              'A',
              config.name[0].toLowerCase(),
              'is considered opened if it reached',
              prettyStates(config.startStates),
            ].join(' ')}
          />
        );
      })}
    </div>
  );
};

export default New;
