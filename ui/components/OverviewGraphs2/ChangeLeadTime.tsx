import React from 'react';
import PageSection from './PageSection.jsx';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, useGridTemplateAreas } from './GraphCard.jsx';
import { prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';

const ChangeLoadTime = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getChangeLeadTimeGraph.useQuery(graphArgs);
  const graphWithConfig = useDecorateForGraph(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  return (
    <PageSection
      heading="Change lead time"
      subheading="Time taken after development to complete a work item"
    >
      <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
        {graphWithConfig?.map(({ config, graphCardProps }) => {
          if (!config) return null;

          if (!config.devCompleteStates) {
            return <div>Dev complete state not specified</div>;
          }
          return (
            <GraphCard
              {...graphCardProps}
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
        })}
      </div>
    </PageSection>
  );
};

export default ChangeLoadTime;
