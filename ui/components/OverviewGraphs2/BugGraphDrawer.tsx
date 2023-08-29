import React, { useMemo, useState } from 'react';
import { byNum, byString, desc } from 'sort-lib';
import { T, multiply, prop, sum } from 'rambda';
import InlineSelect from '../common/InlineSelect.jsx';
import { noGroup } from '../../../shared/work-item-utils.js';
import { toPercentage, divide } from '../../../shared/utils.js';
import type { BugWorkItems } from './BugLeakage.jsx';
import { trpc } from '../../helpers/trpc.js';
import useGraphArgs from './useGraphArgs.js';
import DrawerTabs from '../repo-summary/DrawerTabs.jsx';
import SortableTable from '../common/SortableTable.jsx';
import type { GroupedBugs } from '../../../backend/models/workitems2.js';

const bugCountForGroup = (group: GroupedBugs) => sum(group.bugs.map(prop('count')));

const combinedBugs = (groupedBugs: GroupedBugs[], selectedGroup: string) => {
  const combinedBugsGroupedByRootCauseType = groupedBugs
    .filter(selectedGroup === 'all' ? T : g => g.groupName === selectedGroup)
    .flatMap(prop('bugs'))
    .reduce((acc, bug) => {
      acc.set(bug.rootCauseType, (acc.get(bug.rootCauseType) || 0) + bug.count);
      return acc;
    }, new Map<string, number>());

  const list = Array.from(
    combinedBugsGroupedByRootCauseType,
    ([rootCauseType, count]) => ({
      rootCauseType,
      count,
    })
  ).sort(desc(byNum(prop('count'))));

  return {
    list,
    total: sum(list.map(prop('count'))),
    max: Math.max(...list.map(prop('count'))),
  };
};

const rootCauseFieldCombinedBugs = (
  data: BugWorkItems[number]['data'],
  selectedGroup: string
) => {
  return data.map(({ rootCauseField, groups }) => ({
    rootCauseField,
    combinedBugs: combinedBugs(groups, selectedGroup),
  }));
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
  const workItems = trpc.workItems.getBugLeakageDataForDrawer.useQuery(graphArgs);
  const [selectedGroupName, setSelectedGroupName] = useState(selectedGroup);
  const rootCauseList = useMemo(
    () => rootCauseFieldCombinedBugs(graphData, selectedGroupName),
    [graphData, selectedGroupName]
  );

  const subTypePickerOptions = useMemo(() => {
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
  }, [groups]);

  const tabs = useMemo(() => {
    return rcaFields.map(rcaField => ({
      title: rcaField.label,
      key: rcaField.value,
      // eslint-disable-next-line react/no-unstable-nested-components
      BodyComponent: () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const rootCauseBugs = rootCauseList.find(
          x => x.rootCauseField === rcaField.value
        )!.combinedBugs;

        return (
          <div>
            {selectedGroupName === noGroup ? null : (
              <div className="p-2">
                <span className="text-sm text-theme-helptext mx-1 my-2">Show </span>
                <InlineSelect
                  options={subTypePickerOptions}
                  value={selectedGroupName}
                  onChange={setSelectedGroupName}
                />
              </div>
            )}
            <SortableTable
              data={rootCauseBugs.list}
              rowKey={prop('rootCauseType')}
              variant="drawer"
              columns={[
                {
                  title: 'RCA Type',
                  key: 'rca-type',
                  value: prop('rootCauseType'),
                  sorter: byString(x => x.rootCauseType.toLocaleLowerCase()),
                },
                {
                  title: 'Count',
                  key: 'count',
                  value: prop('count'),
                  sorter: byNum(prop('count')),
                },
                {
                  title: 'Percentage',
                  key: 'percentage',
                  value: x =>
                    divide(x.count, sum(rootCauseBugs.list.map(prop('count'))))
                      .map(toPercentage)
                      .getOr(`0%`),
                  sorter: byNum(x =>
                    divide(x.count, sum(rootCauseBugs.list.map(prop('count'))))
                      .map(multiply(100))
                      .getOr(0)
                  ),
                },
              ]}
              defaultSortColumnIndex={1}
              // eslint-disable-next-line react/no-unstable-nested-components
              ChildComponent={({ item }) => {
                return (
                  <ul>
                    {workItems.data
                      ?.find(x => x.rootCauseField === rcaField.value)
                      ?.bugWorkItems.filter(wi => wi.rootCauseType === item.rootCauseType)
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
    }));
  }, [rcaFields, rootCauseList, selectedGroupName, subTypePickerOptions, workItems.data]);

  return (
    <DrawerTabs
      selectedTabIndex={rcaFields.map(prop('value')).indexOf(selectedRCAField)}
      tabs={tabs}
    />
  );
};

export default BugGraphDrawer;
