import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import { GraphCard, useGridTemplateAreas } from './GraphCard.jsx';
import type { PageSectionBlockProps } from './utils.js';
import { prettyStates, useDecorateForGraph } from './utils.js';
import useGraphArgs from './useGraphArgs.js';
import GraphAreaLoader from './GraphAreaLoader.jsx';
import { GraphEmptyState } from './GraphEmptyState.jsx';

const ChangeLoadTime = ({ openDrawer }: PageSectionBlockProps) => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getChangeLeadTimeGraph.useQuery(graphArgs, {
    keepPreviousData: true,
  });
  const graphWithConfig = useDecorateForGraph(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  if (!graph.data) return <GraphAreaLoader />;

  if (!graph.data.length) {
    return (
      <GraphEmptyState
        heading="No data available"
        description={
          <>
            No work items available.{' '}
            <button className="link-text" onClick={() => openDrawer()}>
              Configure
            </button>{' '}
            the 'Dev completion states' for your work items.
          </>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
      {graphWithConfig ? (
        graphWithConfig.map(({ config, graphCardProps }) => {
          if (!config) return null;

          if (!config.devCompleteStates) {
            return (
              <div>
                Looks like Dev completion dates aren't configured. You may configure this{' '}
                <button>here</button> to enable data visualization.
              </div>
            );
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
