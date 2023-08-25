import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, useGridTemplateAreas } from './GraphCard.jsx';
import { prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';
import GraphAreaLoader from './GraphAreaLoader.jsx';

const ChangeLoadTime = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getChangeLeadTimeGraph.useQuery(graphArgs, {
    keepPreviousData: true,
  });
  const graphWithConfig = useDecorateForGraph(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  return (
    <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
      {graphWithConfig ? (
        graphWithConfig.map(({ config, graphCardProps }) => {
          if (!config) return null;

          if (!config.devCompleteStates) {
            return <div>Dev complete state not specified</div>;
          }
          return (
            <GraphCard
              {...graphCardProps({
                graphName: 'Change lead time',
                drawerComponentName: 'ChangeLeadTimeDrawer',
              })}
              subheading={[
                'Change load time for',
                config.name[0].toLowerCase(),
                'is computed from',
                prettyStates(config.devCompleteStates),
                'to',
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

export default ChangeLoadTime;
