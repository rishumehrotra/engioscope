import React, { useMemo } from 'react';
import { propEq, range, sum } from 'rambda';
import { createPalette, minPluralise, num, prettyMS } from '../../helpers/utils.js';
import { useQueryContext, useQueryPeriodDays } from '../../hooks/query-hooks.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { divide } from '../../../shared/utils.js';
import type {
  CountResponse,
  DateDiffResponse,
} from '../../../backend/models/workitems2.js';
import { isBugLike, noGroup } from '../../../shared/work-item-utils.js';
import { drawerHeading, type GraphCardProps } from './GraphCard.jsx';
import StackedAreaGraph from '../graphs/StackedAreaGraph.jsx';
import NoSelectedPills from './NoSelectedPills.jsx';

export const prettyStates = (startStates: string[]) => {
  if (startStates.length === 1) return `the '${startStates[0]}' state`;
  return `the ${new Intl.ListFormat('en-GB', { type: 'disjunction' }).format(
    startStates.map(x => `'${x}'`)
  )} states`;
};

export const lineColor = createPalette([
  '#3cb44b',
  '#9A6324',
  '#e6194B',
  '#ffe119',
  '#000075',
  '#f58231',
  '#911eb4',
  '#42d4f4',
  '#bfef45',
  '#fabed4',
  '#a9a9a9',
]);

export type WorkItemConfig = NonNullable<
  RouterClient['workItems']['getPageConfig']['workItemsConfig']
>[number];

export const groupHoverTooltipForCounts = (
  workItemConfig: WorkItemConfig,
  data: CountResponse[]
) => {
  return (index: number) => {
    const groups = data.reduce<{ groupName: string; count: number }[]>((acc, line) => {
      const match = line.countsByWeek.find(propEq('weekIndex', index));
      if (!match) return acc;
      acc.push({ groupName: line.groupName, count: match.count });
      return acc;
    }, []);

    if (!groups.length) return null;

    return (
      <div className="bg-theme-backdrop bg-opacity-90 rounded-md text-theme-base-inverted py-2 px-4">
        <div className="flex gap-2 items-center mb-1">
          <img
            src={workItemConfig.icon}
            alt={`Iconn for ${workItemConfig.name[1]}`}
            className="w-3"
          />
          <span className="font-semibold">{workItemConfig.name[1]}</span>
        </div>
        <ul className="text-sm grid grid-cols-[fit-content_1fr] gap-y-0.5">
          {groups.map(item => (
            <li key={item.groupName} className="flex items-center">
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ background: lineColor(item.groupName) }}
              />{' '}
              {item.groupName === noGroup
                ? minPluralise(item.count, ...workItemConfig.name)
                : item.groupName}
              <span className="inline-block ml-2">{num(item.count || 0)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };
};

export const groupHoverTooltipForDateDiff = (
  workItemConfig: WorkItemConfig,
  data: DateDiffResponse[]
) => {
  return (index: number) => {
    const groups = data.reduce<
      { groupName: string; totalDuration: number; count: number }[]
    >((acc, line) => {
      const match = line.countsByWeek.find(w => w.weekIndex === index);
      if (!match) return acc;
      acc.push({
        groupName: line.groupName,
        totalDuration: match.totalDuration,
        count: match.count,
      });
      return acc;
    }, []);

    if (!groups.length) return null;

    return (
      <div className="bg-black rounded-md text-theme-base-inverted py-2 px-4">
        <div className="flex gap-2 items-center mb-1">
          <img
            src={workItemConfig.icon}
            alt={`Iconn for ${workItemConfig.name[1]}`}
            className="w-3"
          />
          <span className="font-semibold">{workItemConfig.name[1]}</span>
        </div>
        <ul className="text-sm grid grid-cols-[fit-content_1fr] gap-y-0.5">
          {groups.map(item => (
            <li key={item.groupName} className="flex items-center">
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ background: lineColor(item.groupName) }}
              />{' '}
              {item.groupName === noGroup
                ? minPluralise(item.count, ...workItemConfig.name)
                : item.groupName}{' '}
              {item.count}
              <span className="inline-block ml-2">
                {divide(item.totalDuration, item.count).map(prettyMS).getOr('-')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export const drawerComponent = (drawerName: keyof typeof import('./Drawers.jsx')) =>
  React.lazy(() => import('./Drawers.jsx').then(x => ({ default: x[drawerName] })));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isDateDiffResponse = (x: any): x is DateDiffResponse => {
  if (!x?.countsByWeek) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return x.countsByWeek.some((y: any) => 'totalDuration' in y);
};

type DateDiffResponseItem = DateDiffResponse['countsByWeek'][number];

export const useDecorateForGraph = <T extends CountResponse | DateDiffResponse>(
  data: { workItemType: string; data: T[] }[] | undefined
) => {
  const queryContext = useQueryContext();
  const queryPeriodDays = useQueryPeriodDays();
  const pageConfig = trpc.workItems.getPageConfig.useQuery({ queryContext });

  return useMemo(() => {
    return data
      ?.map(wit => {
        const config = pageConfig.data?.workItemsConfig?.find(
          w => w.name[0] === wit.workItemType
        );
        return { wit, config };
      })
      .filter(x => !!x.config)
      ?.map(({ wit, config }, index) => {
        if (!config) throw new Error('Stupid TS');

        const witData = wit.data;

        const isDateDiff = data.some(({ data }) => data.some(isDateDiffResponse));

        const graphCardProps = ({
          graphName,
          drawerComponentName,
          combineToValue,
        }: {
          graphName: string;
          combineToValue?: (x: T[]) => number;
          // eslint-disable-next-line @typescript-eslint/consistent-type-imports
          drawerComponentName?: keyof typeof import('./Drawers.jsx');
        }) => {
          const drawer: GraphCardProps<T>['drawer'] = drawerComponentName
            ? (groupName: string) => ({
                heading: drawerHeading(
                  graphName,
                  config,
                  sum(witData.flatMap(d => d.countsByWeek.map(c => c.count)))
                ),
                children: (() => {
                  const Component = drawerComponent(drawerComponentName);
                  return <Component workItemConfig={config} selectedTab={groupName} />;
                })(),
              })
            : undefined;

          const internalCombineToValue: GraphCardProps<T>['combineToValue'] =
            combineToValue ||
            (isDateDiff
              ? values =>
                  divide(
                    sum(
                      values.flatMap(x =>
                        x.countsByWeek.map(y => (y as DateDiffResponseItem).totalDuration)
                      )
                    ),
                    sum(values.flatMap(x => x.countsByWeek.map(y => y.count)))
                  ).getOr(0)
              : values => sum(values.flatMap(x => x.countsByWeek).map(x => x.count)));

          return {
            key: config.name[0],
            index,
            workItemConfig: config,
            data: witData,
            combineToValue: internalCombineToValue,
            lineColor,
            formatValue: isDateDiff ? prettyMS : num,
            graphRenderer: selectedGroups => {
              const linesForGraph = witData.filter(line =>
                selectedGroups.includes(line.groupName)
              );

              if (linesForGraph.length === 0 && witData.length !== 0) {
                return <NoSelectedPills isBug={isBugLike(config.name[0])} />;
              }

              return (
                <StackedAreaGraph
                  className="w-full"
                  lines={linesForGraph.map(line => ({
                    ...line,
                    countsByWeek: range(0, Math.round(queryPeriodDays / 7)).map(
                      weekIndex => ({
                        weekIndex: index,
                        count:
                          line.countsByWeek.find(x => x.weekIndex === weekIndex)?.count ??
                          0,
                        ...(isDateDiff
                          ? {
                              totalDuration:
                                (
                                  line.countsByWeek.find(
                                    x => x.weekIndex === weekIndex
                                  ) as DateDiffResponseItem | undefined
                                )?.totalDuration ?? 0,
                            }
                          : {}),
                      })
                    ),
                  }))}
                  points={x => x.countsByWeek}
                  pointToValue={
                    isDateDiff
                      ? x =>
                          divide(
                            (x as DateDiffResponse['countsByWeek'][number]).totalDuration,
                            x.count
                          ).getOr(0)
                      : x => x.count
                  }
                  lineColor={x => lineColor(x.groupName)}
                  lineLabel={x => x.groupName}
                  xAxisLabel={x => String(x.weekIndex)}
                  yAxisLabel={isDateDiff ? prettyMS : num}
                  crosshairBubble={
                    isDateDiff
                      ? groupHoverTooltipForDateDiff(
                          config,
                          linesForGraph as DateDiffResponse[]
                        )
                      : groupHoverTooltipForCounts(config, linesForGraph)
                  }
                />
              );
            },
            drawer,
          } satisfies Partial<GraphCardProps<T>> & { key: string };
        };
        return { config, data: witData, graphCardProps };
      });
  }, [data, pageConfig.data?.workItemsConfig, queryPeriodDays]);
};
