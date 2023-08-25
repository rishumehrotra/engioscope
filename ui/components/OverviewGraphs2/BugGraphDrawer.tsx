import React, { useEffect, useMemo, useState } from 'react';
import { byNum, byString } from 'sort-lib';
import { multiply } from 'rambda';
import InlineSelect from '../common/InlineSelect.jsx';
import { noGroup } from '../../../shared/work-item-utils.js';
import { toPercentage, divide } from '../../../shared/utils.js';
import type { Group } from './BugLeakage.jsx';
import { trpc } from '../../helpers/trpc.js';
import useGraphArgs from './useGraphArgs.js';
import DrawerTabs from '../repo-summary/DrawerTabs.jsx';
import SortableTable from '../common/SortableTable.jsx';

type CombinedBugs = {
  list: {
    percentage: string;
    rootCauseType: string;
    count: number;
  }[];
  total: number;
  max: number;
} | null;

type NewDrawerProps = {
  selectedRCAField: string;
  selectedGroup: string;
  groups: Group[];
  rcaFields: { label: string; value: string }[];
  rootCauseList: {
    rootCauseField: string;
    combinedBugs: CombinedBugs;
  }[];
};

const BugGraphDrawer = ({
  selectedRCAField,
  selectedGroup,
  groups,
  rcaFields,
  rootCauseList,
}: NewDrawerProps) => {
  const graphArgs = useGraphArgs();
  const workItems = trpc.workItems.getBugLeakageDataForDrawer.useQuery({
    ...graphArgs,
  })?.data;
  const [currentRCAField, setCurrentRCAField] = useState<string>(selectedRCAField);
  const [selectedGroupName, setSelectedGroupName] = useState<string>(selectedGroup);
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

  useEffect(() => {
    setCurrentRCAField(selectedRCAField);
  }, [selectedRCAField]);

  const tabs = rcaFields.map(rcaField => {
    return {
      title: `${rcaField.label}`,
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
              data={
                rootCauseList.find(r => r.rootCauseField === rcaField.value)?.combinedBugs
                  ?.list || []
              }
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
                      rootCauseList
                        .find(r => r.rootCauseField === rcaField.value)
                        ?.combinedBugs?.list.reduce((acc, bug) => acc + bug.count, 0) || 0
                    )
                      .map(toPercentage)
                      .getOr(`0%`),
                  sorter: byNum(x =>
                    divide(
                      x.count,
                      rootCauseList
                        .find(r => r.rootCauseField === rcaField.value)
                        ?.combinedBugs?.list.reduce((acc, bug) => acc + bug.count, 0) || 0
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
                  <ul>
                    {workItems
                      ?.find(x => x.rootCauseField === rcaField.value)
                      ?.bugWorkItems.filter(
                        wi => wi.rootCauseType === item.item.rootCauseType
                      )
                      .map(wi => (
                        <li key={wi.id} className="rounded-md hover:bg-theme-hover group">
                          <a
                            href={wi.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md hover:bg-theme-hover group"
                          >
                            <div className="border-l border-l-transparent pl-10 pt-2 pb-3">
                              <div className="group-hover:text-theme-highlight group-hover:underline mb-2">
                                #{wi.id}: {wi.title}{' '}
                                <span className="bg-theme-tag text-sm px-2 py-1 rounded-md mx-2">
                                  {wi.state}
                                </span>
                              </div>
                            </div>
                          </a>
                        </li>
                      ))}
                  </ul>
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
