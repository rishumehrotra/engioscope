import React, { useMemo } from 'react';
import { prop, range, sum } from 'rambda';
import PageSection from './PageSection.jsx';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useCollectionAndProject, useQueryContext } from '../../hooks/query-hooks.js';
import { createPalette, exists, num } from '../../helpers/utils.js';
import StackedAreaGraph from '../graphs/StackedAreaGraph.jsx';
import { GraphCard } from './GraphCard.jsx';

const prettyStates = (startStates: string[]) => {
  if (startStates.length === 1) return `the '${startStates[0]}' state`;
  return `the ${new Intl.ListFormat('en-GB', { type: 'disjunction' }).format(
    startStates.map(x => `'${x}'`)
  )} states`;
};

export const lineColor = createPalette([
  '#9A6324',
  '#e6194B',
  '#3cb44b',
  '#ffe119',
  '#000075',
  '#f58231',
  '#911eb4',
  '#42d4f4',
  '#bfef45',
  '#fabed4',
  '#a9a9a9',
]);

const New = () => {
  const cnp = useCollectionAndProject();
  const workItemConfig = trpc.workItems.getWorkItemConfig.useQuery(cnp);

  const queryContext = useQueryContext();
  const graph = trpc.workItems.getNewGraph.useQuery({ queryContext });

  const graphWithConfig = useMemo(() => {
    return graph.data
      ?.map(wit => {
        const matchingConfig = workItemConfig.data?.workItemsConfig?.find(
          w => w.name[0] === wit.workItemType
        );
        if (!matchingConfig) return null;
        return { config: matchingConfig, data: wit.data };
      })
      .filter(exists);
  }, [graph.data, workItemConfig.data?.workItemsConfig]);

  const gridTemplateAreas = useMemo(() => {
    if (!workItemConfig.data?.workItemsConfig) return;

    const rowCount = Math.ceil(workItemConfig.data.workItemsConfig.length / 2);

    const graphGrid = range(0, rowCount).reduce<
      [SingleWorkItemConfig | undefined, SingleWorkItemConfig | undefined][]
    >((acc, rowIndex) => {
      acc.push([
        workItemConfig.data.workItemsConfig?.[2 * rowIndex],
        workItemConfig.data.workItemsConfig?.[2 * rowIndex + 1],
      ]);
      return acc;
    }, []);

    return graphGrid
      ?.reduce<string[]>((acc, configs, index) => {
        acc.push(
          `"heading${2 * index} heading${2 * index + 1}"`,
          `"subheading${2 * index} subheading${2 * index + 1}"`,
          `"graphBlock${2 * index} graphBlock${2 * index + 1}"`
        );
        return acc;
      }, [])
      .join(' ');
  }, [workItemConfig.data?.workItemsConfig]);

  return (
    <PageSection
      heading="New work items"
      subheading="Work items on which work work has started"
    >
      <div className="grid grid-cols-2 gap-x-10 py-6" style={{ gridTemplateAreas }}>
        {graphWithConfig?.map(({ config, data }, index) =>
          config ? (
            <GraphCard
              key={config.name[0]}
              workItemConfig={config}
              subheading={[
                'A',
                config.name[0].toLowerCase(),
                'is considered openeed if it reached',
                prettyStates(config.startStates),
              ].join(' ')}
              data={data}
              combineToValue={values => sum(values.map(prop('count')))}
              lineColor={lineColor}
              formatValue={num}
              index={index}
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
                    // lineLabel={x => x.groupName}
                    xAxisLabel={x => String(x.weekIndex)}
                    yAxisLabel={num}
                  />
                );
              }}
            />
          ) : null
        )}
      </div>
    </PageSection>
  );
};

export default New;
