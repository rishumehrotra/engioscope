import React from 'react';
import { sum } from 'rambda';
import PageSection from './PageSection.jsx';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, drawerHeading, useGridTemplateAreas } from './GraphCard.jsx';
import { drawerComponent, prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';

const VelocityDrawer = drawerComponent('VelocityDrawer');

const Velocity = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getVelocityGraph.useQuery(graphArgs);
  const graphWithConfig = useDecorateForGraph(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  return (
    <PageSection heading="Velocity" subheading="Work items completed">
      <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
        {graphWithConfig?.map(({ config, data, graphCardProps }) => {
          if (!config) return null;
          return (
            <GraphCard
              {...graphCardProps}
              subheading={[
                'A',
                config.name[0].toLowerCase(),
                'is considered closed if it reached',
                prettyStates(config.endStates),
              ].join(' ')}
              drawer={groupName => ({
                heading: drawerHeading(
                  'Velocity',
                  config,
                  sum(data.flatMap(d => d.countsByWeek.map(c => c.count)))
                ),
                children: (
                  <VelocityDrawer workItemConfig={config} selectedTab={groupName} />
                ),
              })}
            />
          );
        })}
      </div>
    </PageSection>
  );
};

export default Velocity;
