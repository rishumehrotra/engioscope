import React, { useMemo, useState } from 'react';
import { byDate, byNum, desc } from 'sort-lib';
import { prop } from 'rambda';
import { trpc } from '../../helpers/trpc.js';
import type { WorkItemConfig } from './utils.jsx';
import useGraphArgs from './useGraphArgs.js';
import InlineSelect from '../common/InlineSelect.jsx';
import { shortDate } from '../../helpers/utils.js';
import { noGroup } from '../../../shared/work-item-utils.js';

type NewDrawerProps = {
  selectedTab: string;
  workItemConfig: WorkItemConfig;
};

const NewDrawer = ({ selectedTab, workItemConfig }: NewDrawerProps) => {
  const graphArgs = useGraphArgs();
  const newWorkItems = trpc.workItems.getNewWorkItems.useQuery({
    ...graphArgs,
    workItemType: workItemConfig.name[0],
  });
  const [selectedGroupName, setSelectedGroupName] = useState<string>(selectedTab);

  const subTypePickerOptions = useMemo(() => {
    if (!newWorkItems.data) return [];

    const groupTypeCounts = newWorkItems.data.reduce((acc, wi) => {
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
  }, [newWorkItems.data]);

  const workItemListing = useMemo(() => {
    if (!newWorkItems.data) return [];

    return newWorkItems.data
      .filter(wi => wi.groupName === selectedGroupName)
      .sort(byDate(prop('date')));
  }, [newWorkItems.data, selectedGroupName]);

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

export default NewDrawer;
