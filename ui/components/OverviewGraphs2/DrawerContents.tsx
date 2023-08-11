import React, { useMemo, useState } from 'react';
import { byDate, byNum, desc } from 'sort-lib';
import { range } from 'rambda';
import { Calendar } from 'react-feather';
import InlineSelect from '../common/InlineSelect.jsx';
import { shortDate } from '../../helpers/utils.js';
import { noGroup } from '../../../shared/work-item-utils.js';
import type {
  CountWorkItems,
  DateDiffWorkItems,
} from '../../../backend/models/workitems2.js';
import { useDatesForWeekIndex, useMaxWeekIndex } from '../../hooks/week-index-hooks.js';

type NewDrawerProps = {
  selectedTab: string;
  workItems: (CountWorkItems | DateDiffWorkItems)[] | undefined;
};

const DrawerContents = ({ selectedTab, workItems }: NewDrawerProps) => {
  const [selectedGroupName, setSelectedGroupName] = useState<string>(selectedTab);
  const maxWeekIndex = useMaxWeekIndex();
  const datesForWeekIndex = useDatesForWeekIndex();

  const subTypePickerOptions = useMemo(() => {
    if (!workItems) return [];

    const groupTypeCounts = workItems.reduce((acc, wi) => {
      const count = acc.get(wi.groupName) || 0;
      acc.set(wi.groupName, count + 1);
      return acc;
    }, new Map<string, number>());

    return [...groupTypeCounts.entries()]
      .sort(desc(byNum(x => x[1])))
      .map(([groupName, count]) => ({
        label: `${groupName} (${count})`,
        value: groupName,
      }));
  }, [workItems]);

  const workItemListing2 = useMemo(() => {
    if (!workItems) return [];

    const matchingWorkItems = workItems
      .filter(wi => wi.groupName === selectedGroupName)
      .sort(byDate(x => x.date));

    return range(0, maxWeekIndex)
      .map(datesForWeekIndex)
      .map(({ startDate, endDate }) => ({
        weekStartDate: startDate,
        weekEndDate: endDate,
        workItems: matchingWorkItems.filter(
          wi => wi.date >= startDate && wi.date < endDate
        ),
      }))
      .filter(x => x.workItems.length > 0);
  }, [workItems, maxWeekIndex, datesForWeekIndex, selectedGroupName]);

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
          {workItemListing2.map(({ weekStartDate, weekEndDate, workItems }) => {
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
                          <div className="group-hover:text-theme-highlight group-hover:underline">
                            #{wi.id}: {wi.title}
                          </div>
                          <span className="bg-theme-tag text-sm px-2 py-1 rounded-md">
                            {wi.state}
                          </span>
                        </div>
                        <div className="text-right py-2">{shortDate(wi.date)}</div>
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
