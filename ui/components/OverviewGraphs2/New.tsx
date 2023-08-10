import React from 'react';
import { sum } from 'rambda';
import PageSection from './PageSection.jsx';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, drawerHeading, useGridTemplateAreas } from './GraphCard.jsx';
import { drawerComponent, prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';

const NewDrawer = drawerComponent('NewDrawer');

const New = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getNewGraph.useQuery(graphArgs);
  const graphWithConfig = useDecorateForGraph(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  return (
    <PageSection
      heading="New work items"
      subheading="Work items on which work work has started"
    >
      <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
        {graphWithConfig?.map(({ config, data, graphCardProps }) => {
          if (!config) return null;

          return (
            <GraphCard
              {...graphCardProps}
              subheading={[
                'A',
                config.name[0].toLowerCase(),
                'is considered opened if it reached',
                prettyStates(config.startStates),
              ].join(' ')}
              drawer={groupName => ({
                heading: drawerHeading(
                  'New work items',
                  config,
                  sum(data.flatMap(d => d.countsByWeek.map(c => c.count)))
                ),
                children: <NewDrawer workItemConfig={config} selectedTab={groupName} />,
              })}
            />
          );
        })}
      </div>
    </PageSection>
  );
};

export default New;
