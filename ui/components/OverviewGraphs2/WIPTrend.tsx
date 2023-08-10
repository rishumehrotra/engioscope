import React from 'react';
import { last, sum } from 'rambda';
import PageSection from './PageSection.jsx';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, useGridTemplateAreas } from './GraphCard.jsx';
import { prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';

const WIPTrend = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getWipGraph.useQuery(graphArgs);
  const graphWithConfig = useDecorateForGraph(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  return (
    <PageSection
      heading="Work in progress trend"
      subheading="Trend of work items in progress per day over the last 84 days"
    >
      <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
        {graphWithConfig?.map(({ config, graphCardProps }) => {
          if (!config) return null;
          return (
            <GraphCard
              {...graphCardProps}
              combineToValue={value =>
                sum(value.map(x => last(x.countsByWeek)?.count || 0))
              }
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
    </PageSection>
  );
};

export default WIPTrend;
