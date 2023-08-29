import React, { useEffect, useMemo, useState } from 'react';
import { byNum, byString, desc } from 'sort-lib';
import { multiply, prop, sum } from 'rambda';
import InlineSelect from '../common/InlineSelect.jsx';
import { noGroup } from '../../../shared/work-item-utils.js';
import { toPercentage, divide } from '../../../shared/utils.js';
import type { BugWorkItems } from './BugLeakage.jsx';
import { trpc } from '../../helpers/trpc.js';
import useGraphArgs from './useGraphArgs.js';
import DrawerTabs from '../repo-summary/DrawerTabs.jsx';
import SortableTable from '../common/SortableTable.jsx';
import type { GroupedBugs } from '../../../backend/models/workitems2.js';

const bugCountForGroup = (group: GroupedBugs) => {
  return sum(group.bugs.map(prop('count')));
};

const combinedBugs = (
  data: BugWorkItems[number]['data'],
  selectedField: string,
  selectedGroup: string
) => {
  if (!data) return null;

  const rcaFieldGroupedBugs = data.find(field => field.rootCauseField === selectedField);

  if (!rcaFieldGroupedBugs) return null;

  const groupedBugs = rcaFieldGroupedBugs.groups.filter(group =>
    selectedGroup === 'all' ? group : group.groupName === selectedGroup
  );

  const combinedBugs = groupedBugs.flatMap(group => group.bugs);

  const combinedBugsGroupedByRootCauseType = combinedBugs.reduce((acc, bug) => {
    acc.set(bug.rootCauseType, (acc?.get(bug.rootCauseType) || 0) + bug.count);
    return acc;
  }, new Map<string, number>());

  const list = Array.from(
    combinedBugsGroupedByRootCauseType,
    ([rootCauseType, count]) => ({
      rootCauseType,
      count,
    })
  ).sort(desc(byNum(l => l.count)));

  const max = Math.max(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...list.map(({ count, ...rest }) => count)
  );

  const total = list.reduce((acc, bug) => acc + bug.count, 0);

  return {
    list: list.map(bug => ({
      ...bug,
      percentage: divide(total, bug.count || 0)
        .map(toPercentage)
        .getOr('-'),
    })),
    total,
    max,
  };
};

const rootCauseFieldCombinedBugs = (
  data: BugWorkItems[number]['data'],
  selectedGroup: string
) => {
  return data.map(prop('rootCauseField')).map(field => {
    return {
      rootCauseField: field,
      combinedBugs: combinedBugs(data, field, selectedGroup),
    };
  });
};

type NewDrawerProps = {
  graphData: BugWorkItems[number]['data'];
  selectedRCAField: string;
  selectedGroup: string;
  groups: GroupedBugs[];
  rcaFields: { label: string; value: string }[];
};

const BugGraphDrawer = ({
  graphData,
  selectedRCAField,
  selectedGroup,
  groups,
  rcaFields,
}: NewDrawerProps) => {
  const graphArgs = useGraphArgs();
  const workItems = trpc.workItems.getBugLeakageDataForDrawer.useQuery({
    ...graphArgs,
  })?.data;
  const [currentRCAField, setCurrentRCAField] = useState<string>(selectedRCAField);
  const [selectedGroupName, setSelectedGroupName] = useState<string>(selectedGroup);
  const rootCauseList = useMemo(
    () => rootCauseFieldCombinedBugs(graphData, selectedGroupName),
    [graphData, selectedGroupName]
  );

  const subTypePickerOptions = useMemo(() => {
    if (!workItems) return [];

    return [
      {
        label: `All (${sum(groups.map(bugCountForGroup))})`,
        value: 'all',
      },
      ...groups.map(group => ({
        label: `${group.groupName} (${bugCountForGroup(group)})`,
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
