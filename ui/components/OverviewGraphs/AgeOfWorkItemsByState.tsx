import { allPass, pipe, prop } from 'rambda';
import React, { useCallback, useMemo, useState } from 'react';
import { asc, byDate } from '../../../shared/sort-utils';
import type { UIWorkItem, UIWorkItemType } from '../../../shared/types';
import {
  num, prettyMS, priorityBasedColor
} from '../../helpers/utils';
import { MultiSelectDropdownWithLabel } from '../common/MultiSelectDropdown';
import type { ScatterLineGraphProps } from '../graphs/ScatterLineGraph';
import ScatterLineGraph from '../graphs/ScatterLineGraph';
import { wipWorkItemsCSV } from './helpers/create-csv-content';
import GraphCard from './helpers/GraphCard';
import type { OrganizedWorkItems, WorkItemAccessors } from './helpers/helpers';
import { workItemStateUsing } from './helpers/helpers';
import type { LegendSidebarProps } from './helpers/LegendSidebar';
import { LegendSidebar } from './helpers/LegendSidebar';
import type { ModalArgs } from './helpers/modal-helpers';
import { WorkItemFlatList } from './helpers/modal-helpers';
import { PriorityFilter, SizeFilter } from './helpers/MultiSelectFilters';
import { createWIPWorkItemTooltip } from './helpers/tooltips';

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
  workItemState: (workItem: UIWorkItem) => { state: string; since: Date }
) => (
  useMemo(
    () => {
      const unsorted = Object.entries(groups).reduce<Record<string, { wi: UIWorkItem; since: Date }[]>>(
        (acc, [, wis]) => {
          wis.forEach(wi => {
            const { state, since } = workItemState(wi);
            if (state.startsWith('Before ')) return;
            if (state === 'Done') return;
            acc[state] = acc[state] || [];
            acc[state].push({ wi, since });
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
    [groups, workItemState, workItemType]
  )
);

const fieldName = (fields: string[]) => (
  fields.map(x => `'${x}'`).join(' or a ')
);

type AgeOfWorkItemsByStatusInnerProps = {
  groups: OrganizedWorkItems[string];
  workItemType: UIWorkItemType;
  accessors: WorkItemAccessors;
  workItemTooltip: (workItem: UIWorkItem, additionalSections?: {
    label: string;
    value: string | number;
  }[]) => string;
  openModal: (x: ModalArgs) => void;
};

const AgeOfWorkItemsByStatusInner: React.FC<AgeOfWorkItemsByStatusInnerProps> = ({
  groups, workItemType, accessors, workItemTooltip, openModal
}) => {
  const [priorityFilter, setPriorityFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);
  const [sizeFilter, setSizeFilter] = useState<(wi: UIWorkItem) => boolean>(() => () => true);

  const [selectedStatesForGroups, setSelectedStatesForGroups] = React.useState([] as string[]);
  const selectedStateFilter = useCallback((workItem: UIWorkItem) => {
    if (selectedStatesForGroups.length === 0) return true;
    const group = workItem.groupId ? accessors.workItemGroup(workItem.groupId) : undefined;
    if (!group) return false;
    return selectedStatesForGroups.includes(group.name);
  }, [accessors, selectedStatesForGroups]);

  const allWorkItems = useMemo(
    () => Object.values(groups).flat(),
    [groups]
  );

  const showWorkItem = useMemo(
    () => allPass([priorityFilter, sizeFilter, selectedStateFilter]),
    [priorityFilter, selectedStateFilter, sizeFilter]
  );

  const workItemState = useMemo(
    () => workItemStateUsing(accessors, workItemType),
    [accessors, workItemType]
  );

  const states = useSplitByState(groups, workItemType, workItemState);

  const [checkboxStatesForSidebar, setCheckboxStatesForSidebar] = React.useState(
    Object.keys(states).reduce<Record<string, boolean>>((acc, state) => {
      acc[state] = true;
      return acc;
    }, {})
  );

  const statesToRender = useMemo(
    () => (
      Object.entries(states).reduce<typeof states>(
        (acc, [state, wis]) => {
          if (checkboxStatesForSidebar[state]) {
            acc[state] = wis.filter(pipe(prop('wi'), showWorkItem));
          } else {
            acc[state] = [];
          }

          return acc;
        },
        {}
      )
    ),
    [checkboxStatesForSidebar, showWorkItem, states]
  );

  const hasData = useMemo(
    () => Object.values(statesToRender).some(wis => wis.length > 0),
    [statesToRender]
  );

  const totalWorkItems = useMemo(() => Object.values(statesToRender).reduce(
    (acc, group) => acc + group.length,
    0
  ), [statesToRender]);

  const csvData = useMemo(() => (
    wipWorkItemsCSV(
      Object.values(statesToRender).flat().map(({ wi }) => wi),
      accessors
    )
  ), [accessors, statesToRender]);

  const statterLineGraphProps = useMemo(
    (): ScatterLineGraphProps<{ wi: UIWorkItem; since: Date }> => ({
      className: 'max-w-full',
      graphData: [{
        label: workItemType.name[1],
        data: statesToRender,
        yAxisPoint: x => Date.now() - x.since.getTime(),
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
    () => ({
      headlineStats: [{
        label: workItemType.name[1],
        value: num(totalWorkItems),
        unit: 'total'
      }],
      items: Object.entries(statesToRender).map(([state, wis]) => ({
        label: state,
        value: num(wis.length),
        key: state,
        color: '#9ca3af',
        isChecked: checkboxStatesForSidebar[state]
      })),
      onItemClick: key => openModal({
        heading: key,
        subheading: `${workItemType.name[1]} (${statesToRender[key].length})`,
        body: (
          <WorkItemFlatList
            workItemType={workItemType}
            workItems={statesToRender[key].sort(asc(byDate(prop('since')))).map(prop('wi'))}
            tooltip={workItemTooltip}
            flairs={workItem => [
              prettyMS(Date.now()
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              - statesToRender[key].find(({ wi }) => wi.id === workItem.id)!.since.getTime())
            ]}
          />
        )
      }),
      onCheckboxClick: key => (
        setCheckboxStatesForSidebar(state => ({ ...state, [key]: !state[key] }))
      )
    }),
    [checkboxStatesForSidebar, openModal, statesToRender, totalWorkItems, workItemTooltip, workItemType]
  );

  return (
    <GraphCard
      title={`Age of work-in-progress ${workItemType.name[1].toLowerCase()} by state`}
      subtitle={`Where various ${workItemType.name[1].toLowerCase()} are located, and how long they've been there`}
      hasData={allWorkItems.length > 0 && hasData}
      csvData={csvData}
      left={(
        <>
          <div className="mb-8 flex justify-end mr-4 gap-2">
            {Object.keys(groups).length > 1 && (
              <MultiSelectDropdownWithLabel
                name="groups"
                label={workItemType.groupLabel || 'Groups'}
                options={Object.entries(groups).map(([group, wids]) => ({ label: `${group} (${wids.length})`, value: group }))}
                value={selectedStatesForGroups}
                onChange={setSelectedStatesForGroups}
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

type AgeOfWorkItemsByStatusProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  openModal: (x: ModalArgs) => void;
};

const AgeOfWorkItemsByStatus: React.FC<AgeOfWorkItemsByStatusProps> = ({
  workItems, accessors, openModal
}) => {
  const workItemTooltip = useMemo(
    () => createWIPWorkItemTooltip(accessors),
    [accessors]
  );

  const organised = useMemo(
    () => accessors.organizeByWorkItemType(workItems, accessors.isWIP),
    [accessors, workItems]
  );

  return (
    <>
      {Object.entries(organised).map(([witId, groups]) => (
        <AgeOfWorkItemsByStatusInner
          key={witId}
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

export default AgeOfWorkItemsByStatus;
