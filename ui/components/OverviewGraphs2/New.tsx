import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { append, filter, prop, range, sum } from 'rambda';
import { twJoin } from 'tailwind-merge';
import { ExternalLink } from 'react-feather';
import GraphSection from './GraphSection.jsx';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useCollectionAndProject, useQueryContext } from '../../hooks/query-hooks.js';
import { createPalette, exists, num } from '../../helpers/utils.js';
import { noGroup } from '../../../shared/work-item-utils.js';
import StackedAreaGraph from '../graphs/StackedAreaGraph.jsx';

const prettyStates = (startStates: string[]) => {
  if (startStates.length === 1) return `the '${startStates[0]}' state`;
  return `the ${new Intl.ListFormat('en-GB', { type: 'disjunction' }).format(
    startStates.map(x => `'${x}'`)
  )} states`;
};

const lineColor = createPalette([
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

// eslint-disable-next-line @typescript-eslint/ban-types
type GraphCardProps<T extends {}> = {
  workItemConfig: SingleWorkItemConfig;
  subheading: ReactNode;
  index: number;
  data: {
    groupName: string;
    countsByWeek: T[];
  }[];
  combineToValue: (x: T[]) => number;
  formatValue?: (x: number) => string | number;
  graphRenderer: (selectedGroups: string[]) => ReactNode;
};

// eslint-disable-next-line @typescript-eslint/ban-types
const GraphCard = <T extends {}>({
  workItemConfig,
  subheading,
  index,
  data,
  combineToValue,
  formatValue = num,
  graphRenderer,
}: GraphCardProps<T>) => {
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    data.map(prop('groupName'))
  );

  const toggleSelectedGroup = useCallback(
    (groupName: string) => {
      if (selectedGroups.includes(groupName)) {
        setSelectedGroups(filter(x => x !== groupName));
      } else {
        setSelectedGroups(append(groupName));
      }
    },
    [selectedGroups]
  );

  return (
    <div className="contents">
      <h3 className="flex items-center gap-3" style={{ gridArea: `heading${index}` }}>
        <img
          className="w-4 h-4 inline-block"
          src={workItemConfig.icon}
          alt={`Icon for ${workItemConfig.name[1]}`}
        />
        <span className="text-lg font-medium">{workItemConfig.name[1]}</span>
      </h3>
      <p
        className="text-sm text-theme-helptext"
        style={{ gridArea: `subheading${index}` }}
      >
        {subheading}
      </p>
      <div
        className={twJoin(
          'rounded-xl border border-theme-seperator p-4 mt-4 mb-8',
          'grid grid-flow-row gap-2',
          'grid-rows-[min-content_min-content_1fr_min-content_min-content]',
          'bg-theme-page-content'
        )}
        style={{ gridArea: `graphBlock${index}` }}
      >
        <div className="grid grid-flow-col justify-between items-end">
          <div className="text-lg font-medium">
            {formatValue(combineToValue(data.flatMap(prop('countsByWeek'))))}
          </div>
          <ul className="text-sm flex gap-2">
            {selectedGroups.length !== data.length && (
              <li
                className={twJoin(
                  'pr-2',
                  selectedGroups.length === 0 ? '' : 'border-r border-theme-seperator'
                )}
              >
                <button
                  className="link-text"
                  onClick={() => setSelectedGroups(data.map(prop('groupName')))}
                >
                  Select all
                </button>
              </li>
            )}
            {selectedGroups.length !== 0 && (
              <li>
                <button className="link-text" onClick={() => setSelectedGroups([])}>
                  Clear all
                </button>
              </li>
            )}
          </ul>
        </div>
        <ul className="grid grid-cols-4 gap-2">
          {data.length === 1 && data[0].groupName === noGroup
            ? null
            : data.map(group => (
                <li key={group.groupName}>
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSelectedGroup(group.groupName);
                      }
                    }}
                    onClick={() => toggleSelectedGroup(group.groupName)}
                    className={twJoin(
                      'block border border-l-2 border-theme-seperator rounded-lg p-2 w-full',
                      'text-sm text-left transition-all duration-200 group',
                      'hover:ring-theme-input-highlight hover:ring-1',
                      selectedGroups.includes(group.groupName)
                        ? 'bg-theme-page-content shadow'
                        : 'bg-theme-col-header'
                    )}
                    style={{
                      borderLeftColor: lineColor(group.groupName),
                    }}
                  >
                    <div>{group.groupName || 'Unclassified'}</div>
                    <div className="font-medium flex items-end">
                      <span>{formatValue(combineToValue(group.countsByWeek))}</span>
                      <button
                        className={twJoin(
                          'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                          'group-focus-visible:opacity-100'
                        )}
                      >
                        <ExternalLink className="w-4 mx-2 -mb-0.5 link-text" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
        </ul>
        <div className="self-end min-h-[20rem] flex items-end justify-center">
          {graphRenderer(selectedGroups)}
        </div>
        <div className="text-sm text-theme-helptext">Priority</div>
      </div>
    </div>
  );
};

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
    <GraphSection
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
    </GraphSection>
  );
};

export default New;
