import React from 'react';
import PageSection from './PageSection.jsx';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, useGridTemplateAreas } from './GraphCard.jsx';
import { prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';

const Velocity = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getVelocityGraph.useQuery(graphArgs);
  const graphWithConfig = useDecorateForGraph(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  return (
    <PageSection heading="Velocity" subheading="Work items completed">
      <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
        {graphWithConfig?.map(({ config, graphCardProps }) => {
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
        })}
      </div>
    </PageSection>
  );
};

export default Velocity;
