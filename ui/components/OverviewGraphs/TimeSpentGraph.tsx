import {
  allPass, uniq
} from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import type { UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { divide, exists, mapObj } from '../../../shared/utils';
import { totalCycleTime } from '../../../shared/work-item-utils';
import {
  num, prettyMS, priorityBasedColor
} from '../../helpers/utils';
import useQueryParam, { asBoolean } from '../../hooks/use-query-param';
import { MultiSelectDropdownWithLabel } from '../common/MultiSelectDropdown';
import type { ScatterLineGraphProps } from '../graphs/ScatterLineGraph';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import GraphCard from './helpers/GraphCard';
import type { OrganizedWorkItems, TimeInArea, WorkItemAccessors } from './helpers/helpers';
import { getSidebarItemStats } from './helpers/helpers';
import type { LegendSidebarProps } from './helpers/LegendSidebar';
import { LegendSidebar } from './helpers/LegendSidebar';
import type { ModalArgs } from './helpers/modal-helpers';
import { WorkItemFlatList } from './helpers/modal-helpers';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters';
import { createCompletedWorkItemTooltip } from './helpers/tooltips';

const indexOfStateLabel = (workItemType: UIWorkItemType, stateLabel: string) => {
  if (stateLabel.startsWith('Before ')) return 0;

  if (stateLabel.startsWith('In ')) {
    return (workItemType.workCenters
      .findIndex(wc => wc.label === stateLabel.replace('In ', '')) * 2) + 1;
  }

  if (stateLabel.startsWith('Waiting for ')) {
    return (workItemType.workCenters
      .findIndex(wc => wc.label === stateLabel.replace('Waiting for ', '')) * 2);
  }

  if (stateLabel.startsWith('After ')) {
    return (workItemType.workCenters
      .findIndex(wc => wc.label === stateLabel.replace('After ', '')) * 2) + 2;
  }

  // 'Done'
  return (workItemType.workCenters.length * 2) + 2;
};

const useSplitByState = (
  groups: OrganizedWorkItems[string],
  workItemType: UIWorkItemType,
  timeSpent: (workItem: UIWorkItem) => TimeInArea[]
) => (
  useMemo(
    () => {
      const unsorted = Object.values(groups)
        .reduce<Record<string, { wi: UIWorkItem; timeSpent: TimeInArea }[]>>(
          (acc, wis) => {
            wis.forEach(wi => {
              const times = timeSpent(wi);
              times.forEach(t => {
                if (!t.end) return;
                acc[t.label] = acc[t.label] || [];
                acc[t.label].push({ wi, timeSpent: t });
              });
            });
            return acc;
          },
          {}
        );

      return Object.fromEntries(Object.entries(unsorted).sort(([a], [b]) => (
        indexOfStateLabel(workItemType, a)
        - indexOfStateLabel(workItemType, b)
      )));
    },
    [groups, timeSpent, workItemType]
  )
);

const fieldName = (fields: string[]) => (
  fields.map(x => `'${x}'`).join(' or a ')
);

const trackField = (wi: UIWorkItem) => wi
  .filterBy
  ?.find(x => x.label.toLowerCase().includes('track'));

type TimeSpentGraphInnerProps = {
  witId: string;
  groups: OrganizedWorkItems[string];
  workItemType: UIWorkItemType;
  accessors: WorkItemAccessors;
  workItemTooltip: (workItem: UIWorkItem, additionalSections?: {
    label: string;
    value: string | number;
  }[]) => string;
  openModal: (x: ModalArgs) => void;
};

const TimeSpentGraphInner: React.FC<TimeSpentGraphInnerProps> = ({
  witId, groups: groupsPreFilter, workItemType, accessors, workItemTooltip, openModal
}) => {
  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [selectedTracks, setSelectedTracks] = React.useState([] as string[]);

  const preFilter = useCallback((wi: UIWorkItem) => (
    accessors.workItemTimes(wi).workCenters.every(wc => wc.end)
    && (
      accessors.workItemTimes(wi).workCenters.length
      === workItemType.workCenters.length
    )
  ), [accessors, workItemType.workCenters.length]);

  const groups = useMemo(() => mapObj(
    (wis: UIWorkItem[]) => wis.filter(preFilter)
  )(groupsPreFilter), [groupsPreFilter, preFilter]);

  const allWorkItems = useMemo(
    () => Object.values(groups).flat(),
    [groups]
  );

  const analysisCounts = useMemo(() => ({
    total: Object.values(groupsPreFilter).flat().length,
    analysed: allWorkItems.length
  }), [allWorkItems.length, groupsPreFilter]);

  const states = useSplitByState(groups, workItemType, accessors.timeSpent);

  const [checkboxStatesForSidebar, setCheckboxStatesForSidebar] = React.useState(
    Object.keys(groups).reduce<Record<string, boolean>>((acc, group) => {
      acc[witId + group] = true;
      return acc;
    }, {})
  );

  const tracksList = useMemo(() => (
    allWorkItems
      .map(trackField)
      .filter(exists)
      .reduce<{ label: string; tracks: string[] }>((acc, { label, tags }) => ({
        label,
        tracks: uniq([...acc.tracks, ...tags])
      }), { label: '', tracks: [] })
  ), [allWorkItems]);

  const selectedTracksFilter = useCallback((workItem: UIWorkItem) => {
    if (selectedTracks.length === 0) return true;
    const t = trackField(workItem);
    return t
      ? selectedTracks.some(st => t.tags.some(tg => tg === st))
      : false;
  }, [selectedTracks]);

  const selectedGroupFilter = useCallback((workItem: UIWorkItem) => {
    const group = workItem.groupId ? accessors.workItemGroup(workItem.groupId) : undefined;
    if (!group) return false;
    return checkboxStatesForSidebar[group.witId + group.name];
  }, [accessors, checkboxStatesForSidebar]);

  const showWorkItem = useMemo(
    () => allPass([
      preFilter, priorityFilter, sizeFilter, selectedGroupFilter, selectedTracksFilter
    ]),
    [preFilter, priorityFilter, selectedGroupFilter, selectedTracksFilter, sizeFilter]
  );

  const statesToRender = useMemo(
    () => (
      Object.entries(states).reduce<typeof states>(
        (acc, [state, wis]) => {
          acc[state] = wis.filter(({ wi }) => showWorkItem(wi));
          return acc;
        },
        {}
      )
    ),
    [showWorkItem, states]
  );

  const scatterLineGraphProps = useMemo(
    (): ScatterLineGraphProps<{ wi: UIWorkItem; timeSpent: TimeInArea }> => ({
      className: 'max-w-full',
      graphData: [{
        label: workItemType.name[1],
        data: statesToRender,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        yAxisPoint: x => x.timeSpent.end!.getTime() - x.timeSpent.start.getTime(),
        tooltip: ({ wi }, label, timeTaken) => (
          workItemTooltip(
            wi,
            [{ label: `Was in '${label.replace('In ', '')}' for`, value: prettyMS(timeTaken) }]
          )
        )
      }],
      height: 400,
      linkForItem: ({ wi }) => wi.url,
      pointColor: ({ wi }) => (wi.priority ? priorityBasedColor(wi.priority) : null)
    }),
    [statesToRender, workItemTooltip, workItemType.name]
  );

  const legendSidebarProps: LegendSidebarProps = useMemo(
    () => {
      const items = getSidebarItemStats(
        { [witId]: mapObj((wis: UIWorkItem[]) => wis.filter(showWorkItem))(groups) },
        accessors,
        wis => {
          const cycleTime = divide(totalCycleTime(accessors.workItemTimes)(wis), wis.length).map(prettyMS).getOr('-');
          const numberOfWorkItems = num(wis.length);
          return (
            <span className="flex items-baseline gap-2 max-w-full">
              <span>{cycleTime}</span>
              {cycleTime !== '-' && (
                <span className="text-sm font-normal truncate overflow-hidden">
                  {`${numberOfWorkItems} ${wis.length === 1 ? 'item' : "items'"}`}
                </span>
              )}
            </span>
          );
        },
        group => checkboxStatesForSidebar[group]
      );

      const workItems = Object.values(groups).flat().filter(showWorkItem);
      const cycleTime = divide(accessors.totalCycleTime(workItems), workItems.length)
        .map(prettyMS).getOr('-');

      return {
        headlineStats: [{
          label: workItemType.name[1],
          value: cycleTime,
          unit: `${num(Object.values(groups).flat().filter(showWorkItem).map(x => x).length)} items`
        }],
        items,
        onItemClick: key => {
          const workItems = Object.values(groups)
            .flat()
            .filter(wi => (
              wi.groupId
                ? (({ witId, name }) => witId + name === key)(accessors.workItemGroup(wi.groupId))
                : false
            ));

          return openModal({
            heading: key.slice(32),
            subheading: `${workItemType.name[1]} (${workItems.length})`,
            body: (
              <WorkItemFlatList
                workItemType={workItemType}
                workItems={workItems}
                tooltip={workItemTooltip}
                // flairs={workItem => [
                //   prettyMS(Date.now()
                //     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                //     - workItems.find(wi => wi.id === workItem.id)!.timeSpent.end!.getTime())
                // ]}
              />
            )
          });
        },
        onCheckboxClick: key => (
          setCheckboxStatesForSidebar(state => ({ ...state, [key]: !state[key] }))
        )
      };
    },
    [accessors, checkboxStatesForSidebar, groups, openModal, showWorkItem, witId, workItemTooltip, workItemType]
  );

  return (
    <GraphCard
      title={`Time spent - ${workItemType.name[1].toLowerCase()}`}
      subtitle={`Where did the ${
        workItemType.name[1].toLowerCase()
      } that closed in the last ${
        accessors.queryPeriodDays
      } days spent their time?`}
      hasData={allWorkItems.length > 0}
      left={(
        <>
          <div className="mb-8 flex justify-end mr-4 gap-2">
            {tracksList.label && tracksList.tracks.length && (
              <MultiSelectDropdownWithLabel
                name="groups"
                label={tracksList.label}
                options={tracksList.tracks.map(t => ({ label: t, value: t }))}
                value={selectedTracks}
                onChange={setSelectedTracks}
                className="w-64 text-sm"
              />
            )}
            <SizeFilter setFilter={setSizeFilter} workItems={allWorkItems} />
            <PriorityFilter setFilter={setPriorityFilter} workItems={allWorkItems} />
          </div>
          {Object.values(statesToRender).flat().length
            ? <ScatterLineGraph {...scatterLineGraphProps} />
            : (
              <p className="bg-yellow-100 py-2 px-4">
                {`Your filters don't match any ${workItemType.name[0].toLowerCase()}`}
              </p>
            )}

          {analysisCounts.analysed === analysisCounts.total
            ? null
            : (
              <p className="text-gray-600 text-sm pl-4 mt-4 italic">
                {'Only analysing '}
                <span className="font-semibold">{num(analysisCounts.analysed)}</span>
                {' of '}
                <span className="font-semibold">{num(analysisCounts.total)}</span>
                {` ${workItemType.name[
                  analysisCounts.total === 1 ? 0 : 1
                ].toLowerCase()} due to incomplete stage data for the rest.`}
              </p>
            )}

          <details className="text-sm text-gray-600 pl-4 mt-4 bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
            <summary className="cursor-pointer">How is this computed?</summary>
            <ul className="list-disc pl-8">
              {workItemType.workCenters.flatMap((wc, index, wcs) => ([
                index !== 0 ? (
                  <li key={`waiting for ${wc.label}`}>
                    {`The 'Waiting for ${wc.label}' duration is computed from the ${
                      fieldName(wcs[index - 1].endDateField)
                    } to the ${fieldName(wc.startDateField)}.`}
                  </li>
                ) : undefined,
                <li key={`in ${wc.label}`}>
                  {`The 'In ${wc.label}' duration is computed from the ${
                    fieldName(wc.startDateField)
                  } to the ${fieldName(wc.endDateField)}.`}
                </li>,
                index === wcs.length - 1 ? (
                  <li key={`after ${wc.label}`}>
                    {`The 'After ${wc.label}' duration is computed from the ${
                      fieldName(wc.endDateField)
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    } to the ${fieldName(workItemType.endDateFields!)}.`}
                  </li>
                ) : undefined
              ]))}
            </ul>
          </details>
        </>
      )}
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

type TimeSpentGraphProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

const TimeSpentGraph: React.FC<TimeSpentGraphProps> = ({
  workItems, accessors, openModal
}) => {
  const [timeSpentEnabled] = useQueryParam('time-spent', asBoolean);
  const workItemTooltip = useMemo(
    () => createCompletedWorkItemTooltip(accessors),
    [accessors]
  );

  const preFilteredWorkItems = useMemo(
    () => workItems.filter(accessors.isWorkItemClosed),
    [accessors.isWorkItemClosed, workItems]
  );

  const organised = useMemo(
    () => accessors.organizeByWorkItemType(preFilteredWorkItems, accessors.isWorkItemClosed),
    [accessors, preFilteredWorkItems]
  );

  if (!timeSpentEnabled) return null;

  return (
    <>
      {Object.entries(organised)
        .filter(([, group]) => Object.values(group).flat().length)
        .filter(([witId]) => accessors.workItemType(witId).name[0].toLowerCase() === 'feature')
        .map(([witId, groups]) => (
          <TimeSpentGraphInner
            key={witId}
            witId={witId}
            groups={groups}
            accessors={accessors}
            workItemTooltip={workItemTooltip}
            workItemType={accessors.workItemType(witId)}
            openModal={openModal}
          />
        ))}
    </>
  );
};

export default TimeSpentGraph;
