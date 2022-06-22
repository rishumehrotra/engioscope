import { allPass, prop, uniq } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import { asc, byDate } from '../../../shared/sort-utils';
import type { UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { divide, exists } from '../../../shared/utils';
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
      const unsorted = Object.values(groups).reduce<Record<string, { wi: UIWorkItem; timeSpent: TimeInArea }[]>>(
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
  witId, groups, workItemType, accessors, workItemTooltip, openModal
}) => {
  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [selectedTracks, setSelectedTracks] = React.useState([] as string[]);

  const allWorkItems = useMemo(
    () => Object.values(groups).flat(),
    [groups]
  );

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
      priorityFilter, sizeFilter, selectedGroupFilter, selectedTracksFilter
    ]),
    [priorityFilter, selectedGroupFilter, selectedTracksFilter, sizeFilter]
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

  const hasData = useMemo(
    () => Object.values(statesToRender).some(wis => wis.length > 0),
    [statesToRender]
  );

  const statterLineGraphProps = useMemo(
    (): ScatterLineGraphProps<{ wi: UIWorkItem; timeSpent: TimeInArea }> => ({
      className: 'max-w-full',
      graphData: [{
        label: workItemType.name[1],
        data: statesToRender,
        yAxisPoint: x => x.timeSpent.end!.getTime() - x.timeSpent.start.getTime(),
        tooltip: ({ wi }, label, timeTaken) => (
          workItemTooltip(
            wi,
            [{ label: `In '${label.replace('In ', '')}' since`, value: prettyMS(timeTaken) }]
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
        { [witId]: groups },
        accessors,
        wis => divide(totalCycleTime(accessors.workItemTimes)(wis), wis.length).map(prettyMS).getOr('-'),
        group => checkboxStatesForSidebar[group]
      );
      return {
        headlineStats: [{
          label: workItemType.name[1],
          value: num(allWorkItems.length),
          unit: 'total'
        }],
        items,
        onItemClick: key => openModal({
          heading: key,
          subheading: `${workItemType.name[1]} (${statesToRender[key].length})`,
          body: (
            <WorkItemFlatList
              workItemType={workItemType}
              workItems={statesToRender[key].sort(asc(byDate(x => x.timeSpent.end!))).map(prop('wi'))}
              tooltip={workItemTooltip}
              flairs={workItem => [
                prettyMS(Date.now()
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                - statesToRender[key].find(({ wi }) => wi.id === workItem.id)!.timeSpent.end!.getTime())
              ]}
            />
          )
        }),
        onCheckboxClick: key => (
          setCheckboxStatesForSidebar(state => ({ ...state, [key]: !state[key] }))
        )
      };
    },
    [accessors, allWorkItems.length, checkboxStatesForSidebar, groups, openModal, statesToRender, witId, workItemTooltip, workItemType]
  );

  return (
    <GraphCard
      title={`Time spent - ${workItemType.name[1].toLowerCase()} by stages`}
      subtitle={`Where various closed ${workItemType.name[1].toLowerCase()} spent their time`}
      hasData={allWorkItems.length > 0 && hasData}
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
          <ScatterLineGraph {...statterLineGraphProps} />
          <details className="text-sm text-gray-600 pl-4 mt-4 bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
            <summary className="cursor-pointer">How is this computed?</summary>
            <ul className="list-disc pl-8">
              {workItemType.workCenters.flatMap((wc, index, wcs) => ([
                index !== 0 ? (
                  <li key={`waiting for ${wc.label}`}>
                    {`A ${workItemType.name[0].toLowerCase()} is in the 'Waiting for ${wc.label}' state
                    if it has a ${fieldName(wcs[index - 1].endDateField)} but doesn't have
                    a ${fieldName(wc.startDateField)}.`}
                  </li>
                ) : undefined,
                <li key={`in ${wc.label}`}>
                  {`A ${workItemType.name[0].toLowerCase()} is in the 'In ${wc.label}' state
                  if it has a ${fieldName(wc.startDateField)} but doesn't have
                  a ${fieldName(wc.endDateField)}.`}
                </li>,
                index === wcs.length - 1 ? (
                  <li key={`after ${wc.label}`}>
                    {`A ${workItemType.name[0].toLowerCase()} is in the 'After ${wc.label}' state
                    if it has a ${fieldName(wc.endDateField)} but doesn't have a `}
                    {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                    {`${fieldName(workItemType.endDateFields!)}.`}
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
      {Object.entries(organised).map(([witId, groups]) => (
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
