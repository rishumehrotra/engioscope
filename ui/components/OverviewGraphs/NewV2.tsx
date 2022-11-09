import { prop, range, sum } from 'rambda';
import React, {
  useCallback, useEffect, useMemo, useState
} from 'react';
import { noGroup } from '../../../shared/work-item-utils.js';
import { trpc } from '../../helpers/trpc.js';
import { num, shortDate } from '../../helpers/utils.js';
import { useCollectionAndProject, useQueryPeriod } from '../../hooks/query-hooks.js';
import useQueryParam, { asString } from '../../hooks/use-query-param.js';
import useQueryPeriodDays from '../../hooks/use-query-period-days.js';
import type { LineGraphProps } from '../graphs/LineGraph.jsx';
import LineGraph from '../graphs/LineGraph.jsx';
import Loading from '../Loading.jsx';
import { CrosshairBubble } from './helpers/CrosshairBubble-v2.jsx';
import GraphCard from './helpers/GraphCard.jsx';
import { lineColor, stringifyDateField } from './helpers/helpers.js';
import type { LegendSidebarProps } from './helpers/LegendSidebar.jsx';
import { LegendSidebar } from './helpers/LegendSidebar.jsx';
import type { ModalArgs } from './helpers/modal-helpers.jsx';
import { WorkItemsByGroup, WorkItemsByDate } from './helpers/modal-helpers.jsx';

type Point = {
  date: Date;
  value: number;
};

type Line = {
  label: string;
  workItemTypeName: string;
  groupName: string;
  points: Point[];
};

const dataByDay = (
  workItemSummary: Record<string, Record<string, Record<string, number>>>,
  workItemTypes: { name: string[] }[],
  queryPeriodDays: number
) => {
  const lines: Map<
    { workItemType: string; groupName: string },
    Map<string, number>
  > = new Map(
    Object.entries(workItemSummary)
      .flatMap(([workItemTypeName, groups]) => Object.entries(groups).map(([groupName, dates]) => (
        [{ workItemType: workItemTypeName, groupName }, new Map(Object.entries(dates))]
      )))
  );

  return [...lines.entries()].map(([{ workItemType, groupName }, dates]): Line => ({
    label: groupName === noGroup
      ? workItemTypes.find(wit => wit.name[0] === workItemType)?.name[1] || workItemType
      : `${workItemTypes.find(wit => wit.name[0] === workItemType)?.name[1]} - ${groupName}`,
    workItemTypeName: workItemType,
    groupName,
    points: range(0, queryPeriodDays)
      .reverse()
      .map(daysOffset => {
        const day = new Date();
        day.setDate(day.getDate() - daysOffset);
        const dayString = day.toISOString().split('T')[0];

        return {
          date: day,
          value: dates.get(dayString) || 0
        };
      })
  }));
};

const useAdditionalFilters = () => {
  const [filters] = useQueryParam<string>('filter', asString);

  return useMemo(() => (
    !filters
      ? {}
      : Object.fromEntries(
        filters
          .split(';')
          .map(part => part.split(':'))
          .map(([label, tags]) => ([label, tags.split(',')]))
      )
  ), [filters]);
};

const useSidebarCheckboxState = () => {
  const [checkboxState, setCheckboxState] = useState<Record<string, boolean>>({});

  const onCheckboxClick = useCallback((key: string) => {
    setCheckboxState(s => ({ ...s, [key]: !s[key] }));
  }, []);

  const isChecked = useCallback((key: string) => Boolean(checkboxState[key]), [checkboxState]);

  const setSummary = useCallback((workItemSummary: Record<string, Record<string, Record<string, number>>>) => {
    setCheckboxState(() => Object.entries(workItemSummary)
      .reduce<Record<string, boolean>>((acc, [workItemTypeName, groups]) => {
        Object.keys(groups).forEach(groupName => {
          const key = groupName === noGroup
            ? workItemTypeName
            : (`${workItemTypeName}-${groupName}`);

          acc[key] = true;
        });
        return acc;
      }, {}));
  }, []);

  return [onCheckboxClick, isChecked, setSummary] as const;
};

type NewWorkItemsByGroupProps = {
  workItemTypeName: string;
  groupName: string;
};

const NewWorkItemsByGroup: React.FC<NewWorkItemsByGroupProps> = ({ workItemTypeName, groupName }) => {
  const cnp = useCollectionAndProject();
  const qp = useQueryPeriod();
  const additionalFilters = useAdditionalFilters();

  const workItems = trpc.workItems.newWorkItemsListForGroup.useQuery({
    ...cnp, ...qp, additionalFilters, workItemType: workItemTypeName, groupName
  });

  if (!workItems.data) return <Loading />;

  return (
    <WorkItemsByDate
      workItemTypeName={workItemTypeName}
      groupName={groupName}
      workItems={workItems.data}
    />
  );
};

type NewWorkItemsByDateProps = {
  date: Date;
};

const NewWorkItemsByDate: React.FC<NewWorkItemsByDateProps> = ({ date }) => {
  const cnp = useCollectionAndProject();
  const qp = useQueryPeriod();
  const additionalFilters = useAdditionalFilters();

  const workItems = trpc.workItems.nenwWorkItemsListForDate.useQuery({
    ...cnp, additionalFilters, date, timeZone: qp.queryPeriod[2]
  });

  if (!workItems.data) return <Loading />;

  return (
    <WorkItemsByGroup workItems={workItems.data} />
  );
};

type NewGraphProps = {
  openModal: (x: ModalArgs) => void;
};

const NewGraph: React.FC<NewGraphProps> = ({ openModal }) => {
  const cnp = useCollectionAndProject();
  const qp = useQueryPeriod();
  const [queryPeriodDays] = useQueryPeriodDays();
  const additionalFilters = useAdditionalFilters();

  const workItemSummary = trpc.workItems.newWorkItems.useQuery({
    ...cnp, ...qp, additionalFilters
  });

  const workItemTypes = trpc.workItems.getWorkItemTypes.useQuery(cnp);

  const [onCheckboxClick, isChecked, setSummary] = useSidebarCheckboxState();

  useEffect(() => {
    if (workItemSummary.data) setSummary(workItemSummary.data);
  }, [setSummary, workItemSummary.data]);

  const dataToShow = useMemo(() => (
    dataByDay(workItemSummary.data || {}, workItemTypes.data || [], queryPeriodDays)
      .filter(line => isChecked(`${line.workItemTypeName}${
        line.groupName === noGroup ? '' : `-${line.groupName}`
      }`))
  ), [isChecked, queryPeriodDays, workItemSummary.data, workItemTypes.data]);

  const legendSidebarProps = useMemo((): LegendSidebarProps => ({
    headlineStats: Object.entries(workItemSummary.data || {}).map(([workItemTypeName, groups]) => ({
      label: workItemTypes.data?.find(wit => wit.name[0] === workItemTypeName)?.name[1]
        || workItemTypeName,
      value: num(sum(Object.values(groups).flatMap(group => Object.values(group)))),
      unit: ''
    })),
    items: Object.entries(workItemSummary.data || {})
      .flatMap(([workItemTypeName, groups]) => {
        const matchingWit = workItemTypes.data?.find(wit => wit.name[0] === workItemTypeName);

        if (Object.keys(groups).length === 1 && Object.keys(groups)[0] === noGroup) {
          return [{
            iconUrl: matchingWit?.icon || '',
            label: matchingWit?.name[1] || workItemTypeName,
            value: num(sum(Object.values(groups).flatMap(Object.values))),
            key: workItemTypeName,
            color: lineColor({ groupName: noGroup, witId: workItemTypeName }),
            isChecked: isChecked(workItemTypeName)
          }];
        }
        return Object.entries(groups).flatMap(([groupName, byDate]) => ({
          iconUrl: matchingWit?.icon || '',
          label: groupName,
          value: num(sum(Object.values(byDate))),
          key: `${workItemTypeName}-${groupName}`,
          color: lineColor({ groupName, witId: workItemTypeName }),
          isChecked: isChecked(`${workItemTypeName}-${groupName}`)
        }));
      }),
    onItemClick: key => {
      const wit = (workItemTypes.data || []).find(wit => (
        key.startsWith(`${wit.name[0]}-`) || key === wit.name[0]
      ));

      if (!wit) return;

      const groupName = key === wit.name[0] ? noGroup : key.replace(`${wit.name[0]}-`, '');
      const groupCount = sum(Object.values(workItemSummary.data?.[wit.name[0]][groupName] || {}));

      return openModal({
        heading: 'New work items',
        subheading: `${wit.name[1]} ${groupName === noGroup ? '' : `/ ${groupName}`} (${groupCount})`,
        body: <NewWorkItemsByGroup workItemTypeName={wit.name[0]} groupName={groupName} />
      });
    },
    onCheckboxClick
  }), [isChecked, onCheckboxClick, openModal, workItemSummary.data, workItemTypes.data]);

  const showCrosshairBubble = useCallback((pointIndex: number) => (
    <CrosshairBubble
      title="New work items"
      date={dataToShow[0].points[pointIndex].date}
      items={dataToShow
        .map(line => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const matchingWit = (workItemTypes.data || []).find(wit => wit.name[0] === line.workItemTypeName)!;

          return {
            workItemType: matchingWit,
            label: line.label,
            lineColor: lineColor({ witId: line.workItemTypeName, groupName: line.groupName }),
            value: num(line.points[pointIndex].value)
          };
        })
        .filter(x => x.value !== '0')}
    />
  ), [dataToShow, workItemTypes.data]);

  const lineGraphProps = useMemo<LineGraphProps<Line, Point>>(() => ({
    className: 'max-w-full',
    lines: dataToShow,
    points: prop('points'),
    pointToValue: point => point.value,
    yAxisLabel: num,
    lineLabel: line => line.label,
    xAxisLabel: point => shortDate(point.date),
    lineColor: line => lineColor({ groupName: line.groupName, witId: line.workItemTypeName }),
    crosshairBubble: showCrosshairBubble,
    onClick: pointIndex => {
      const { date } = dataToShow[0].points[pointIndex];

      return openModal({
        heading: 'New work items',
        subheading: shortDate(date),
        body: <NewWorkItemsByDate date={date} />
      });
    }
  }), [dataToShow, openModal, showCrosshairBubble]);

  if (workItemSummary.isLoading) return <Loading />;

  return (
    <GraphCard
      title="New work items"
      subtitle={`Work items on which work started in the last ${queryPeriodDays} days`}
      hasData
      renderLazily={false}
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            {/* <SizeFilter workItems={preFilteredWorkItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={preFilteredWorkItems} setFilter={setPriorityFilter} /> */}
          </div>
          <LineGraph<Line, Point> {...lineGraphProps} />
          <ul className="text-sm text-gray-600 pl-8 mt-4 list-disc bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
            {(workItemTypes.data || [])
              .filter(wit => Object.keys(workItemSummary.data || {}).includes(wit.name[0]))
              .map(wit => (
                <li key={wit.name[0]}>
                  {`A ${wit.name[0].toLowerCase()} is considered opened if it has a `}
                  {`${
                    wit.name[0].toLowerCase().includes('bug')
                      ? 'created date'
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      : stringifyDateField(wit.startDateFields!)
                  } within the last ${queryPeriodDays} days.`}
                </li>
              ))}
          </ul>
        </>
      )}
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

export default NewGraph;
