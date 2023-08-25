import React, { useMemo, useState } from 'react';
import { byDate, byNum, desc } from 'sort-lib';
import { T, range } from 'rambda';
import { Calendar, Clock } from 'react-feather';
import InlineSelect from '../common/InlineSelect.jsx';
import { prettyMS, shortDate } from '../../helpers/utils.js';
import { noGroup } from '../../../shared/work-item-utils.js';
import type {
  CountWorkItems,
  DateDiffWorkItems,
} from '../../../backend/models/workitems2.js';
import { useDatesForWeekIndex, useMaxWeekIndex } from '../../hooks/week-index-hooks.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import { oneWeekInMs } from '../../../shared/utils.js';

type DrawerContentsProps<T extends CountWorkItems | DateDiffWorkItems> = {
  selectedTab: string;
  workItems: T[] | undefined;
  workItemDetailsRenderer?: React.FC<{ workitem: T }>;
};

const DrawerContents = <T extends CountWorkItems | DateDiffWorkItems>({
  selectedTab,
  workItems,
  workItemDetailsRenderer: ChildComponent,
}: DrawerContentsProps<T>) => {
  const [selectedGroupName, setSelectedGroupName] = useState<string>(selectedTab);
  const queryContext = useQueryContext();
  const maxWeekIndex = useMaxWeekIndex();
  const datesForWeekIndex = useDatesForWeekIndex();
  const subTypePickerOptions = useMemo(() => {
    if (!workItems) return [];

    const groupTypeCounts = workItems.reduce((acc, wi) => {
      const count = acc.get(wi.groupName) || 0;
      acc.set(wi.groupName, count + 1);
      return acc;
    }, new Map<string, number>());

    return [
      { label: `All (${workItems.length})`, value: 'all' },
      ...[...groupTypeCounts.entries()]
        .sort(desc(byNum(x => x[1])))
        .map(([groupName, count]) => ({
          label: `${groupName} (${count})`,
          value: groupName,
        })),
    ];
  }, [workItems]);

  const workItemListing = useMemo(() => {
    if (!workItems) return [];

    const matchingWorkItems = workItems
      .filter(selectedGroupName === 'all' ? T : wi => wi.groupName === selectedGroupName)
      .sort(byDate(x => x.date));

    const minDateMs = Math.min(...workItems.map(w => w.date.getTime()));

    return range(
      Math.floor((minDateMs - queryContext[2].getTime()) / oneWeekInMs),
      maxWeekIndex
    )
      .map(datesForWeekIndex)
      .map(({ startDate, endDate }) => ({
        weekStartDate: startDate,
        weekEndDate: endDate,
        workItems: matchingWorkItems.filter(
          wi => wi.date >= startDate && wi.date < endDate
        ),
      }))
      .filter(x => x.workItems.length > 0);
  }, [workItems, queryContext, maxWeekIndex, datesForWeekIndex, selectedGroupName]);

  return (
    <div className="mx-4">
      {selectedGroupName === noGroup ? null : (
        <>
          <span className="text-sm text-theme-helptext">Show </span>
          <InlineSelect
            options={subTypePickerOptions}
            value={selectedGroupName}
            onChange={setSelectedGroupName}
          />
        </>
      )}

      <div className="relative">
        <div className="absolute top-2 left-9 h-full border-l border-l-theme-input -z-10" />
        <ol className="pt-2">
          {workItemListing.map(({ weekStartDate, weekEndDate, workItems }) => {
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
                  {workItems.map(wi => (
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
                          {ChildComponent ? (
                            <ChildComponent workitem={wi} />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="bg-theme-tag text-sm px-2 py-1 rounded-md">
                                {wi.state}
                              </span>
                              <Clock size={16} className="text-theme-icon" />
                              <span>{prettyMS(Date.now() - wi.date.getTime())}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right py-2">
                          <span>{shortDate(wi.date)}</span>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default DrawerContents;
