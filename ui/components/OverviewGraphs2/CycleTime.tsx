import React from 'react';
import { prop, range, sum } from 'rambda';
import PageSection from './PageSection.jsx';
import { trpc } from '../../helpers/trpc.js';
import { prettyMS } from '../../helpers/utils.js';
import StackedAreaGraph from '../graphs/StackedAreaGraph.jsx';
import { GraphCard, useGridTemplateAreas } from './GraphCard.jsx';
import {
  prettyStates,
  lineColor,
  useMergeWithConfig,
  groupHoverTooltipForDateDiff,
} from './utils.js';
import { divide } from '../../../shared/utils.js';
import useGraphArgs from './useGraphArgs.js';

const CycleTime = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getCycleTimeGraph.useQuery(graphArgs);
  const graphWithConfig = useMergeWithConfig(graph.data);
  const gridTemplateAreas = useGridTemplateAreas();

  return (
    <PageSection heading="Cycle time" subheading="Time taken to complete a work item">
      <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
        {graphWithConfig?.map(({ config, data }, index) => {
          if (!config) return null;
          return (
            <GraphCard
              key={config.name[0]}
              index={index}
              workItemConfig={config}
              subheading={[
                'Cycle time for',
                config.name[0].toLowerCase(),
                'is computed from',
                prettyStates(config.startStates),
                'to',
                prettyStates(config.endStates),
              ].join(' ')}
              data={data}
              combineToValue={values =>
                divide(
                  sum(values.map(prop('totalDuration'))),
                  sum(values.map(prop('count')))
                ).getOr(0)
              }
              lineColor={lineColor}
              formatValue={prettyMS}
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
                        totalDuration:
                          line.countsByWeek.find(x => x.weekIndex === weekIndex)
                            ?.totalDuration ?? 0,
                      })),
                    }))}
                    points={x => x.countsByWeek}
                    pointToValue={x => divide(x.totalDuration, x.count).getOr(0)}
                    lineColor={x => lineColor(x.groupName)}
                    lineLabel={x => x.groupName}
                    xAxisLabel={x => String(x.weekIndex)}
                    yAxisLabel={prettyMS}
                    crosshairBubble={groupHoverTooltipForDateDiff(linesForGraph)}
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

export default CycleTime;
