import React from 'react';
import { last, sum } from 'rambda';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, useGridTemplateAreas } from './GraphCard.jsx';
import { prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';

const WIPTrend = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getWipGraph.useQuery(graphArgs, {
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
              graphName: 'Work in progress trend',
              drawerComponentName: 'WIPTrendDrawer',
              combineToValue: value =>
                sum(value.map(x => last(x.countsByWeek)?.count || 0)),
            })}
            subheading={[
              'A',
              config.name[0].toLowerCase(),
              'considered to be WIP if it has a',
              prettyStates(config.startStates),
              "but doesn't have a",
              prettyStates(config.endStates),
            ].join(' ')}
          />
        );
      })}
    </div>
  );
};

export default WIPTrend;
