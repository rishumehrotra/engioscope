import React, { useMemo, useState } from 'react';
import { byDate, byNum, desc } from 'sort-lib';
import InlineSelect from '../common/InlineSelect.jsx';
import { shortDate } from '../../helpers/utils.js';
import { noGroup } from '../../../shared/work-item-utils.js';
import type {
  CountWorkItems,
  DateDiffWorkItems,
} from '../../../backend/models/workitems2.js';

type NewDrawerProps = {
  selectedTab: string;
  workItems: (CountWorkItems | DateDiffWorkItems)[] | undefined;
};

const DrawerContents = ({ selectedTab, workItems }: NewDrawerProps) => {
  const [selectedGroupName, setSelectedGroupName] = useState<string>(selectedTab);

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

  const workItemListing = useMemo(() => {
    if (!workItems) return [];

    return workItems
      .filter(wi => wi.groupName === selectedGroupName)
      .sort(byDate(x => x.date));
  }, [workItems, selectedGroupName]);

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

      <ul>
        {workItemListing.map(wi => (
          <li key={wi.id}>
            <a
              href={wi.url}
              target="_blank"
              rel="noreferrer"
              className="grid grid-cols-[1fr_70px] py-2 px-2 rounded-md hover:bg-theme-hover group"
            >
              <div>
                <div className="group-hover:text-theme-highlight group-hover:underline">
                  #{wi.id}: {wi.title}
                </div>
                <span className="bg-theme-tag text-sm px-2 py-1 rounded-md">
                  {wi.state}
                </span>
              </div>
              <div className="text-right">{shortDate(wi.date)}</div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DrawerContents;
