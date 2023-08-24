import React, { useEffect, useMemo, useState } from 'react';
import { byDate, byNum, byString } from 'sort-lib';
import { multiply, range } from 'rambda';
import { Calendar } from 'react-feather';
import InlineSelect from '../common/InlineSelect.jsx';
import { shortDate } from '../../helpers/utils.js';
import { noGroup } from '../../../shared/work-item-utils.js';
import { useDatesForWeekIndex, useMaxWeekIndex } from '../../hooks/week-index-hooks.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import { oneWeekInMs, toPercentage, divide } from '../../../shared/utils.js';
import type { Group } from './BugLeakage.jsx';
import { trpc } from '../../helpers/trpc.js';
import useGraphArgs from './useGraphArgs.js';
import DrawerTabs from '../repo-summary/DrawerTabs.jsx';
import SortableTable from '../common/SortableTable.jsx';

type NewDrawerProps = {
  selectedRCAField: string;
  selectedGroup: string;
  groups: Group[];
  rcaFields: { label: string; value: string }[];
  combinedBugs: {
    list: {
      percentage: string;
      rootCauseType: string;
      count: number;
    }[];
    total: number;
    max: number;
  } | null;
};

const BugGraphDrawer = ({
  selectedRCAField,
  selectedGroup,
  groups,
  rcaFields,
  combinedBugs,
}: NewDrawerProps) => {
  const graphArgs = useGraphArgs();
  const workItems = trpc.workItems.getBugLeakageDataForDrawer.useQuery({
    ...graphArgs,
  })?.data;
  const [currentRCAField, setCurrentRCAField] = useState<string>(selectedRCAField);
  const [selectedGroupName, setSelectedGroupName] = useState<string>(selectedGroup);
  const queryContext = useQueryContext();
  const maxWeekIndex = useMaxWeekIndex();
  const datesForWeekIndex = useDatesForWeekIndex();
  const subTypePickerOptions = useMemo(() => {
    if (!workItems) return [];

    return [
      {
        label: `All (${groups.reduce((sum, group) => sum + group.count, 0)})`,
        value: 'all',
      },
      ...groups.map(group => ({
        label: `${group.groupName} (${group.count})`,
        value: group.groupName,
      })),
    ];
  }, [groups, workItems]);

  const workItemListing = useMemo(() => {
    if (!workItems) return [];
    const matchingField = workItems.find(wi => wi.rootCauseField === currentRCAField);

    if (!matchingField) return [];

    const matchingGroupWorkItems =
      selectedGroupName === 'all'
        ? matchingField.bugWorkItems.sort(byDate(x => x.date))
        : matchingField.bugWorkItems
            .filter(wi => wi.groupName === selectedGroupName)
            .sort(byDate(x => x.date));

    const minDateMs = Math.min(...matchingField.bugWorkItems.map(w => w.date.getTime()));

    return range(
      Math.floor((minDateMs - queryContext[2].getTime()) / oneWeekInMs),
      maxWeekIndex
    )
      .map(datesForWeekIndex)
      .map(({ startDate, endDate }) => ({
        weekStartDate: startDate,
        weekEndDate: endDate,
        workItems: matchingGroupWorkItems.filter(
          wi => wi.date >= startDate && wi.date < endDate
        ),
      }))
      .filter(x => x.workItems.length > 0);
  }, [
    workItems,
    selectedGroupName,
    queryContext,
    maxWeekIndex,
    datesForWeekIndex,
    currentRCAField,
  ]);

  useEffect(() => {
    setCurrentRCAField(selectedRCAField);
  }, [selectedRCAField]);

  const tabs = rcaFields.map(rcaField => {
    return {
      title: `${rcaField.label} (${workItems?.find(
        x => x.rootCauseField === rcaField.value
      )?.bugWorkItems.length})`,
      key: rcaField.value,
      // eslint-disable-next-line react/no-unstable-nested-components
      BodyComponent: () => {
        return (
          <div>
            {selectedGroupName === noGroup ? null : (
              <>
                <span className="text-sm text-theme-helptext mx-1 my-2">Show </span>
                <InlineSelect
                  options={subTypePickerOptions}
                  value={selectedGroupName}
                  onChange={setSelectedGroupName}
                />
              </>
            )}
            <SortableTable
              data={combinedBugs?.list || []}
              rowKey={x => x.rootCauseType.toString()}
              variant="drawer"
              columns={[
                {
                  title: 'RCA Type',
                  key: 'rca-type',

                  value: x => x.rootCauseType,
                  sorter: byString(x => x.rootCauseType.toLocaleLowerCase()),
                },
                {
                  title: 'Count',
                  key: 'count',

                  value: x => x.count,
                  sorter: byNum(x => x.count),
                },
                {
                  title: 'Percentage',
                  key: 'percentage',

                  value: x =>
                    divide(
                      x.count,
                      combinedBugs?.list.reduce((acc, bug) => acc + bug.count, 0) || 0
                    )
                      .map(toPercentage)
                      .getOr(`0%`),
                  sorter: byNum(x =>
                    divide(
                      x.count,
                      combinedBugs?.list.reduce((acc, bug) => acc + bug.count, 0) || 0
                    )
                      .map(multiply(100))
                      .getOr(0)
                  ),
                },
              ]}
              defaultSortColumnIndex={1}
              // eslint-disable-next-line react/no-unstable-nested-components
              ChildComponent={item => {
                return (
                  <div className="relative">
                    <div className="absolute top-2 left-9 h-full border-l border-l-theme-input -z-10" />
                    <ol className="pt-2">
                      {workItemListing.map(
                        ({ weekStartDate, weekEndDate, workItems }) => {
                          if (
                            !workItems.some(
                              wi => wi.rootCauseType === item.item.rootCauseType
                            )
                          ) {
                            return null;
                          }

                          return (
                            <li key={weekEndDate.toISOString()}>
                              <div className="grid grid-cols-[auto_1fr] items-center my-2">
                                <span className="text-theme-icon mx-4 bg-theme-tag p-3 rounded-full">
                                  <Calendar size={18} />
                                </span>
                                <h2 className="font-medium text-lg">
                                  {shortDate(weekStartDate)} - {shortDate(weekEndDate)} (
                                  {workItems.length})
                                </h2>
                              </div>

                              <ul>
                                {workItems
                                  .filter(
                                    wi => wi.rootCauseType === item.item.rootCauseType
                                  )
                                  .map(wi => (
                                    <li key={wi.id}>
                                      <a
                                        href={wi.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="grid grid-cols-[1fr_70px] gap-4 pl-9 pr-2 rounded-md hover:bg-theme-hover group"
                                      >
                                        <div className="border-l border-l-transparent hover:border-l-theme-input pl-10 pt-2 pb-3">
                                          <div className="group-hover:text-theme-highlight group-hover:underline mb-2">
                                            #{wi.id}: {wi.title}
                                          </div>
                                          <span className="bg-theme-tag text-sm px-2 py-1 rounded-md">
                                            {wi.state}
                                          </span>
                                        </div>
                                        <div className="text-right py-2">
                                          {shortDate(wi.date)}
                                        </div>
                                      </a>
                                    </li>
                                  ))}
                              </ul>
                            </li>
                          );
                        }
                      )}
                    </ol>
                  </div>
                );
              }}
            />
          </div>
        );
      },
    };
  });

  return (
    <DrawerTabs
      selectedTabIndex={Math.max(0, rcaFields.map(f => f.value).indexOf(currentRCAField))}
      tabs={tabs}
    />
  );
};

export default BugGraphDrawer;
