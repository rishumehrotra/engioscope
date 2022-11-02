import { sum } from 'rambda';
import React, { useMemo } from 'react';
import { noGroup } from '../../../shared/work-item-utils.js';
import { trpc } from '../../helpers/trpc.js';
import { num } from '../../helpers/utils.js';
import { useCollectionAndProject, useQueryPeriod } from '../../hooks/query-hooks.js';
import useQueryPeriodDays from '../../hooks/use-query-period-days.js';
import Loading from '../Loading.jsx';
import GraphCard from './helpers/GraphCard.jsx';
import { lineColor, stringifyDateField } from './helpers/helpers.js';
import type { LegendSidebarProps } from './helpers/LegendSidebar.jsx';
import { LegendSidebar } from './helpers/LegendSidebar.jsx';

type NewGraphProps = {
  // openModal: (x: ModalArgs) => void;
};

const NewGraph: React.FC<NewGraphProps> = (/* { openModal } */) => {
  const cnp = useCollectionAndProject();
  const qp = useQueryPeriod();
  const [queryPeriodDays] = useQueryPeriodDays();

  const workItemSummary = trpc.workItems.newWorkItems.useQuery({
    ...cnp, ...qp, additionalFilters: {}
  });

  const workItemTypes = trpc.workItems.getWorkItemTypes.useQuery(cnp);

  const legendSidebarProps = useMemo((): LegendSidebarProps => ({
    headlineStats: Object.entries(workItemSummary.data || {}).map(([workItemTypeName, groups]) => ({
      label: workItemTypes.data?.find(wit => wit.name[0] === workItemTypeName)?.name[1]
        || workItemTypeName,
      value: num(sum(Object.values(groups).flatMap(group => Object.values(group)))),
      unit: ''
    })),
    items: Object.entries(workItemSummary.data || {}).flatMap(([workItemTypeName, groups]) => {
      const matchingWit = workItemTypes.data?.find(wit => wit.name[0] === workItemTypeName);

      if (Object.keys(groups).length === 1 && Object.keys(groups)[0] === noGroup) {
        return [{
          iconUrl: matchingWit?.icon || '',
          label: matchingWit?.name[1] || workItemTypeName,
          value: num(sum(Object.values(groups).flatMap(g => Object.values(g)))),
          key: workItemTypeName,
          color: lineColor({ groupName: noGroup, witId: workItemTypeName })
        }];
      }
      return Object.entries(groups).flatMap(([groupName, byDate]) => ({
        iconUrl: matchingWit?.icon || '',
        label: groupName,
        value: num(sum(Object.values(byDate))),
        key: `${workItemTypeName}-${groupName}`,
        color: lineColor({ groupName, witId: workItemTypeName })
      }));
    }),
    onItemClick: key => console.log(key)
  }), [workItemSummary.data, workItemTypes.data]);

  if (workItemSummary.isLoading) return <Loading />;

  return (
    <GraphCard
      title="New work items"
      subtitle={`Work items on which work started in the last ${queryPeriodDays} days`}
      hasData
      renderLazily={false}
      left={(
        <>
          <div className="flex justify-end mb-8 gap-2">
            {/* <SizeFilter workItems={preFilteredWorkItems} setFilter={setSizeFilter} />
            <PriorityFilter workItems={preFilteredWorkItems} setFilter={setPriorityFilter} /> */}
          </div>
          {/* <LineGraph<WorkItemLine, WorkItemPoint> {...lineGraphProps} /> */}
          <ul className="text-sm text-gray-600 pl-8 mt-4 list-disc bg-gray-50 p-2 border-gray-200 border-2 rounded-md">
            {(workItemTypes.data || [])
              .filter(wit => Object.keys(workItemSummary.data || {}).includes(wit.name[0]))
              .map(wit => (
                <li key={wit.name[0]}>
                  {`A ${wit.name[0].toLowerCase()} is considered opened if it has a `}
                  {`${
                    wit.name[0].toLowerCase().includes('bug')
                      ? 'created date'
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      : stringifyDateField(wit.startDateFields!)
                  } within the last ${queryPeriodDays} days.`}
                </li>
              ))}
          </ul>
        </>
      )}
      right={<LegendSidebar {...legendSidebarProps} />}
    />
  );
};

export default NewGraph;
