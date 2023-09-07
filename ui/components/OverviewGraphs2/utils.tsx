import React, { useCallback, useMemo } from 'react';
import { renderToString } from 'react-dom/server';
import { prop, propEq, range, sum } from 'rambda';
import {
  createPalette,
  minPluralise,
  num,
  prettyMS,
  shortDate,
} from '../../helpers/utils.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
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
import { useDatesForWeekIndex, useMaxWeekIndex } from '../../hooks/week-index-hooks.js';

export const prettyStates = (startStates: string[]) => {
  if (startStates.length === 1) return `the '${startStates[0]}' state`;
  return `the ${new Intl.ListFormat('en-GB', { type: 'disjunction' }).format(
    startStates.map(x => `'${x}'`)
  )} states`;
};

export const prettyFields = (
  fieldsGroup: string[],
  fieldNameLookup: Record<string, string> | undefined
) => {
  if (fieldsGroup.length === 1) {
    return `the '${fieldNameLookup?.[fieldsGroup[0]] || fieldsGroup[0]}' field`;
  }
  return `the ${new Intl.ListFormat('en-GB', { type: 'conjunction' }).format(
    fieldsGroup.map(x => `'${fieldNameLookup?.[x] || x}'`)
  )} fields`;
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
  data: CountResponse[],
  datesForWeekIndex: ReturnType<typeof useDatesForWeekIndex>,
  workItemConfig?: WorkItemConfig
) => {
  return (index: number) => {
    const groups = data.reduce<{ groupName: string; count: number }[]>((acc, line) => {
      const match = line.countsByWeek.find(propEq('weekIndex', index));
      if (!match) return acc;
      acc.push({ groupName: line.groupName, count: match.count });
      return acc;
    }, []);

    if (!groups.length) return null;

    return renderToString(
      <div className="bg-theme-backdrop bg-opacity-90 rounded-md text-theme-base-inverted min-w-[13rem]">
        <div className="grid grid-cols-[0.75rem_1fr_1fr] gap-2 justify-between items-center text-base font-semibold mb-2">
          <img
            src={workItemConfig?.icon}
            alt={`Icon for ${workItemConfig?.name[1]}`}
            className="w-3 block"
          />
          <span className="font-semibold">{workItemConfig?.name[1]}</span>
          <div className="text-right">{shortDate(datesForWeekIndex(index).endDate)}</div>
        </div>
        <ul className="text-sm grid grid-cols-[fit-content_1fr] gap-y-0.5">
          {groups.map(item => (
            <li key={item.groupName} className="flex items-center">
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ background: lineColor(item.groupName) }}
              />{' '}
              {item.groupName === noGroup
                ? workItemConfig
                  ? minPluralise(item.count, ...workItemConfig.name)
                  : ''
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
  data: DateDiffResponse[],
  datesForWeekIndex: ReturnType<typeof useDatesForWeekIndex>,
  workItemConfig?: WorkItemConfig
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

    return renderToString(
      <div className="bg-black rounded-md text-theme-base-inverted">
        <div className="grid grid-cols-[0.75rem_1fr_1fr] gap-2 justify-between items-center text-base font-semibold mb-2">
          <img
            src={workItemConfig?.icon}
            alt={`Icon for ${workItemConfig?.name[1]}`}
            className="w-3 block"
          />
          <span className="font-semibold">{workItemConfig?.name[1]}</span>
          <div className="text-right">{shortDate(datesForWeekIndex(index).endDate)}</div>
        </div>
        <ul className="text-sm grid grid-cols-[fit-content_1fr] gap-y-0.5">
          {groups.map(item => (
            <li key={item.groupName} className="flex items-center">
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ background: lineColor(item.groupName) }}
              />{' '}
              {item.groupName === noGroup
                ? workItemConfig
                  ? minPluralise(item.count, ...workItemConfig.name)
                  : ''
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
  const maxWeekIndex = useMaxWeekIndex();
  const datesForWeekIndex = useDatesForWeekIndex();
  const pageConfig = trpc.workItems.getPageConfig.useQuery(
    { queryContext },
    { keepPreviousData: true }
  );

  const isDateDiff = useMemo(
    () => data?.some(x => x.data.some(isDateDiffResponse)),
    [data]
  );

  const fillGapsForGraph = useCallback(
    (linesForGraph: T[]) =>
      linesForGraph.map(line => ({
        ...line,
        countsByWeek: range(0, maxWeekIndex).map(weekIndex => ({
          weekIndex,
          count: line.countsByWeek.find(x => x.weekIndex === weekIndex)?.count ?? 0,
          ...(isDateDiff
            ? {
                totalDuration:
                  (
                    line.countsByWeek.find(x => x.weekIndex === weekIndex) as
                      | DateDiffResponseItem
                      | undefined
                  )?.totalDuration ?? 0,
              }
            : {}),
        })),
      })),
    [isDateDiff, maxWeekIndex]
  );

  return useMemo(() => {
    if (!data || !pageConfig.data) return;

    return data
      ?.map(wit => {
        const config = pageConfig.data?.workItemsConfig?.find(
          w => w.name[0] === wit.workItemType
        );
        return { wit, config };
      })
      .filter(x => !!x.config)
      ?.map(({ wit, config }, index) => {
        const witData = wit.data;

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

          const drawer: GraphCardProps<T>['drawer'] = drawerComponentName
            ? (groupName: string) => ({
                heading: drawerHeading(
                  graphName,
                  config,
                  internalCombineToValue(witData)
                ),
                children: (() => {
                  const Component = drawerComponent(drawerComponentName);
                  return <Component workItemConfig={config} selectedTab={groupName} />;
                })(),
              })
            : undefined;

          return {
            key: wit.workItemType,
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
                return <NoSelectedPills isBug={isBugLike(wit.workItemType)} />;
              }

              return (
                <StackedAreaGraph
                  className="w-full h-80 pt-3"
                  lines={fillGapsForGraph(linesForGraph)}
                  points={x => x.countsByWeek}
                  pointToValue={
                    isDateDiff
                      ? x =>
                          divide(
                            (x as DateDiffResponse['countsByWeek'][number]).totalDuration,
                            x.count
                          ).getOr(0)
                      : prop('count')
                  }
                  lineColor={x => lineColor(x.groupName)}
                  lineLabel={prop('groupName')}
                  xAxisLabel={x => shortDate(datesForWeekIndex(x.weekIndex).endDate)}
                  yAxisLabel={isDateDiff ? prettyMS : num}
                  crosshairBubble={
                    isDateDiff
                      ? groupHoverTooltipForDateDiff(
                          linesForGraph as DateDiffResponse[],
                          datesForWeekIndex,
                          config
                        )
                      : groupHoverTooltipForCounts(
                          linesForGraph,
                          datesForWeekIndex,
                          config
                        )
                  }
                />
              );
            },
            drawer,
          } satisfies Partial<GraphCardProps<T>> & { key: string };
        };
        return { config, data: witData, graphCardProps };
      });
  }, [data, datesForWeekIndex, fillGapsForGraph, isDateDiff, pageConfig.data]);
};

export type PageSectionBlockProps = {
  openDrawer: (workItemConfig?: string) => void;
};
