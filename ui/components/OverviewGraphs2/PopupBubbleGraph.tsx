import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { append, filter, prop, sum } from 'rambda';
import { twJoin } from 'tailwind-merge';
import { Check } from 'react-feather';
import { Tooltip } from 'react-tooltip';
import { trpc, type SingleWorkItemConfig } from '../../helpers/trpc.js';
import useGraphArgs from './useGraphArgs.js';
import { exists, num, prettyMS } from '../../helpers/utils.js';
import { divide } from '../../../shared/utils.js';
import ScatterLineGraph from '../graphs/ScatterLineGraph.jsx';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';

type Props = {
  type: 'wip' | 'closed';
  workItemConfig: SingleWorkItemConfig;
  lineColor: (x: string) => string;
};

const PopupBubbleGraph = ({ type, workItemConfig, lineColor }: Props) => {
  const graphArgs = useGraphArgs();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTooltipId, setSelectedTooltipId] = useState<number | undefined>();
  const { collectionName } = useCollectionAndProject();

  const workItems = trpc.workItems.getWorkItemTimeSpent.useQuery({
    type,
    ...graphArgs,
    workItemType: workItemConfig.name[0],
  });

  const wiTooltip = trpc.workItems.getWorkItemTooltip.useQuery(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    { collectionName, id: selectedTooltipId! },
    { enabled: Boolean(selectedTooltipId) }
  );

  const wiWithTimeSpent = useMemo(() => {
    return workItems.data?.map(wi => ({
      ...wi,
      timeSpent: wi.stateChanges.reduce<{ state: string; time: number }[]>(
        (acc, stateChange, index) => {
          if (index === 0) return acc;
          acc.push({
            state: wi.stateChanges[index - 1].state,
            time: stateChange.date.getTime() - wi.stateChanges[index - 1].date.getTime(),
          });
          return acc;
        },
        []
      ),
    }));
  }, [workItems.data]);

  const states = useMemo(() => {
    const states = wiWithTimeSpent?.reduce((acc, wi) => {
      wi.timeSpent.forEach(s => {
        const state = acc.get(s.state) || { time: 0, count: 0 };
        acc.set(s.state, {
          time: state.time + s.time,
          count: state.count + 1,
        });
      });

      return acc;
    }, new Map<string, { time: number; count: number }>());

    return states && [...states.entries()].map(([state, rest]) => ({ state, ...rest }));
  }, [wiWithTimeSpent]);

  const totalCycleTime = useMemo(() => {
    return divide(
      sum(workItems.data?.map(prop('cycleTime')) || []),
      workItems.data?.length || 0
    );
  }, [workItems.data]);

  const groups = useMemo(() => {
    const groupsMap = workItems.data?.reduce((acc, wi) => {
      const prev = acc.get(wi.groupName) || { time: 0, count: 0 };
      acc.set(wi.groupName, { time: prev.time + wi.cycleTime, count: prev.count + 1 });
      return acc;
    }, new Map<string, { time: number; count: number }>());

    return (
      groupsMap &&
      [...groupsMap.entries()].map(([groupName, rest]) => ({ groupName, ...rest }))
    );
  }, [workItems.data]);

  useEffect(() => {
    setSelectedGroups(groups?.map(prop('groupName')) || []);
  }, [groups]);

  const toggleSelectedGroup = useCallback(
    (groupName: string) => {
      if (selectedGroups.includes(groupName)) {
        setSelectedGroups(filter(x => x !== groupName));
      } else {
        setSelectedGroups(append(groupName));
      }
    },
    [selectedGroups]
  );

  const graphData = useMemo(
    () =>
      Object.fromEntries(
        (states || [])
          .map(state => {
            return [
              state.state,
              (wiWithTimeSpent || [])
                .filter(wi => selectedGroups.includes(wi.groupName))
                .map(wi => ({
                  ...wi,
                  stateTime: sum(
                    wi.timeSpent.filter(t => t.state === state.state).map(prop('time'))
                  ),
                })),
            ] as const;
          })
          .filter(exists)
      ),
    [selectedGroups, states, wiWithTimeSpent]
  );

  return (
    <div className="p-6 grid grid-flow-row gap-4">
      <div>
        <div className="text-lg font-bold">
          {totalCycleTime.map(prettyMS).getOr('-')}{' '}
          <span className="text-base font-normal text-theme-helptext inline-block pl-1">
            {workItems.data?.length} items
          </span>
        </div>
      </div>
      <div>
        <ul className="grid grid-cols-4 gap-2 items-stretch">
          {groups?.map(group => (
            <li key={group.groupName}>
              <button
                onClick={() => toggleSelectedGroup(group.groupName)}
                className={twJoin(
                  'flex flex-col w-full h-full',
                  'border border-l-2 border-theme-seperator rounded-lg p-2',
                  'text-sm text-left transition-all duration-200 group',
                  selectedGroups.includes(group.groupName)
                    ? 'bg-theme-page-content'
                    : 'bg-theme-col-header'
                )}
                style={{
                  borderLeftColor: lineColor(group.groupName),
                  boxShadow: selectedGroups.includes(group.groupName)
                    ? 'rgba(30, 41, 59, 0.05) 0px 4px 3px'
                    : undefined,
                }}
              >
                <div className="grid grid-flow-col justify-between w-full">
                  <div>{group.groupName || 'Unclassified'}</div>
                  <div>
                    <Check
                      size={20}
                      className={twJoin(
                        'text-theme-highlight transition-opacity',
                        !selectedGroups.includes(group.groupName) && 'opacity-0'
                      )}
                    />
                  </div>
                </div>
                <div className="font-medium flex items-end">
                  <span>{divide(group.time, group.count).map(prettyMS).getOr('-')}</span>
                  <span className="inline-block text-theme-helptext ml-2">
                    ({num(group.count)})
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="overflow-x-auto mt-6">
        <ScatterLineGraph
          graphData={[
            {
              label: workItemConfig.name[1],
              data: graphData,
              yAxisPoint: x => x.stateTime,
              tooltip: x => String(x.id),
            },
          ]}
          height={400}
          linkForItem={x => x.url}
          pointTooltipId="bubble-graph-tooltip"
          onPointHover={x => setSelectedTooltipId(x.id)}
        />
        <Tooltip id="bubble-graph-tooltip">
          <div className="w-96">
            <div className="font-medium mb-2">
              <img
                src={workItemConfig.icon}
                className="w-4 h-4 mr-2 inline-block"
                alt={`Icon for ${workItemConfig.name[1]}`}
              />
              {wiTooltip.data?.title}
            </div>
            <div>
              Priority:{' '}
              {wiTooltip.data ? wiTooltip.data.priority ?? 'No priority' : '...'}
            </div>
            {wiTooltip.data?.severity && <div>Severity: {wiTooltip.data.severity}</div>}
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default PopupBubbleGraph;
