import React from 'react';
import { range } from 'rambda';
import PageSection from './PageSection.jsx';
import { trpc } from '../../helpers/trpc.js';
import { num } from '../../helpers/utils.js';
import StackedAreaGraph from '../graphs/StackedAreaGraph.jsx';
import {
  GraphCard,
  drawerHeading,
  graphCardPropsForCount,
  useGridTemplateAreas,
} from './GraphCard.jsx';
import {
  prettyStates,
  lineColor,
  useMergeWithConfig,
  groupHoverTooltipForCounts,
} from './utils.js';
import useGraphArgs from './useGraphArgs.js';

const New = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getNewGraph.useQuery(graphArgs);
  const graphWithConfig = useMergeWithConfig(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  return (
    <PageSection
      heading="New work items"
      subheading="Work items on which work work has started"
    >
      <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
        {graphWithConfig?.map(({ config, data }, index) => {
          if (!config) return null;

          return (
            <GraphCard
              {...graphCardPropsForCount(config, data, index)}
              subheading={[
                'A',
                config.name[0].toLowerCase(),
                'is considered openeed if it reached',
                prettyStates(config.startStates),
              ].join(' ')}
              drawer={groupName => ({
                heading: drawerHeading('New work items', config),
                children: <div>{groupName}</div>,
              })}
              // eslint-disable-next-line react/no-unstable-nested-components
              graphRenderer={selectedLines => {
                const linesForGraph = data.filter(line =>
                  selectedLines.includes(line.groupName)
                );

                if (linesForGraph.length === 0) {
                  return (
                    <div className="mb-48 text-center text-sm text-theme-helptext">
                      No data
                    </div>
                  );
                }

                return (
                  <StackedAreaGraph
                    className="w-full"
                    lines={linesForGraph.map(line => ({
                      ...line,
                      countsByWeek: range(
                        0,
                        Math.max(
                          ...data.flatMap(x => x.countsByWeek).map(x => x.weekIndex)
                        )
                      ).map(weekIndex => ({
                        weekIndex: index,
                        count:
                          line.countsByWeek.find(x => x.weekIndex === weekIndex)?.count ??
                          0,
                      })),
                    }))}
                    points={x => x.countsByWeek}
                    pointToValue={x => x.count}
                    lineColor={x => lineColor(x.groupName)}
                    lineLabel={x => x.groupName}
                    xAxisLabel={x => String(x.weekIndex)}
                    yAxisLabel={num}
                    crosshairBubble={groupHoverTooltipForCounts(config, linesForGraph)}
                  />
                );
              }}
            />
          );
        })}
      </div>
    </PageSection>
  );
};

export default New;
