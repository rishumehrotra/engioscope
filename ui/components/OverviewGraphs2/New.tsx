import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { prop, range, sum } from 'rambda';
import { twJoin } from 'tailwind-merge';
import GraphSection from './GraphSection.jsx';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useCollectionAndProject, useQueryContext } from '../../hooks/query-hooks.js';
import { exists, num } from '../../helpers/utils.js';

const prettyStates = (startStates: string[]) => {
  if (startStates.length === 1) return `the '${startStates[0]}' state`;
  return `the ${new Intl.ListFormat('en-GB', { type: 'disjunction' }).format(
    startStates.map(x => `'${x}'`)
  )} states`;
};

type SingleWorkItemConfig = NonNullable<
  RouterClient['workItems']['getWorkItemConfig']['workItemsConfig']
>[number];

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
};

// eslint-disable-next-line @typescript-eslint/ban-types
const GraphCard = <T extends {}>({
  workItemConfig,
  subheading,
  index,
  data,
  combineToValue,
  formatValue = num,
}: GraphCardProps<T>) => {
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
          'rounded-md border border-theme-seperator p-4 mt-4 mb-6',
          'grid grid-flow-row gap-2',
          'grid-rows-[min-content_min-content_1fr_min-content]'
        )}
        style={{ gridArea: `graphBlock${index}` }}
      >
        <div className="grid grid-flow-col justify-between items-end">
          <div className="text-lg font-medium">
            {formatValue(combineToValue(data.flatMap(x => x.countsByWeek)))}
          </div>
          <div className="text-sm flex gap-3">
            <button className="link-text">Select all</button>
            <button className="link-text">Clear all</button>
          </div>
        </div>
        <ul className="grid grid-cols-4 gap-2">
          {data.map(group => (
            <li>
              <button
                className={twJoin(
                  'border border-theme-seperator rounded-lg text-sm p-2 block w-full text-left',
                  'hover:border-theme-input-highlight'
                )}
              >
                <div>{group.groupName || 'Unclassified'}</div>
                <div className="font-medium">
                  {formatValue(combineToValue(group.countsByWeek))}
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="self-end">foobar</div>
      </div>
    </div>
  );
};

const New = () => {
  const cnp = useCollectionAndProject();
  const workItemConfig = trpc.workItems.getWorkItemConfig.useQuery(cnp);

  const queryContext = useQueryContext();
  const graph = trpc.workItems.getNewGraph.useQuery({
    queryContext,
    workItemType: 'Feature',
  });

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
      <div className="grid grid-cols-2 gap-x-8 py-6" style={{ gridTemplateAreas }}>
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
            />
          ) : null
        )}
      </div>
    </GraphSection>
  );
};

export default New;
