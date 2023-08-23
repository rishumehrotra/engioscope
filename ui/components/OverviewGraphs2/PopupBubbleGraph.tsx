import React, { useMemo } from 'react';
import { prop, sum } from 'rambda';
import { trpc, type SingleWorkItemConfig } from '../../helpers/trpc.js';
import useGraphArgs from './useGraphArgs.js';
import { prettyMS } from '../../helpers/utils.js';
import { divide } from '../../../shared/utils.js';

type Props = {
  type: 'wip' | 'closed';
  workItemConfig: SingleWorkItemConfig;
};

const PopupBubbleGraph = ({ type, workItemConfig }: Props) => {
  const graphArgs = useGraphArgs();

  const workItems = trpc.workItems.getWorkItemTimeSpent.useQuery({
    type,
    ...graphArgs,
    workItemType: workItemConfig.name[0],
  });

  // const wiWithTimeSpent = useMemo(() => {
  //   return workItems.data?.map(wi => ({
  //     ...wi,
  //     timeSpent: wi.stateChanges.reduce<{ state: string; time: number }[]>(
  //       (acc, stateChange, index) => {
  //         if (index === 0) return acc;
  //         acc.push({
  //           state: wi.stateChanges[index - 1].state,
  //           time: stateChange.date.getTime() - wi.stateChanges[index - 1].date.getTime(),
  //         });
  //         return acc;
  //       },
  //       []
  //     ),
  //   }));
  // }, [workItems.data]);

  // const states = useMemo(() => {
  //   const states = wiWithTimeSpent?.reduce((acc, wi) => {
  //     wi.timeSpent.forEach(s => {
  //       const state = acc.get(s.state) || { time: 0, count: 0 };
  //       acc.set(s.state, {
  //         time: state.time + s.time,
  //         count: state.count + 1,
  //       });
  //     });

  //     return acc;
  //   }, new Map<string, { time: number; count: number }>());

  //   return states && [...states.entries()].map(([state, rest]) => ({ state, ...rest }));
  // }, [wiWithTimeSpent]);

  const totalCycleTime = useMemo(() => {
    return divide(
      sum(workItems.data?.map(prop('cycleTime')) || []),
      workItems.data?.length || 0
    );
  }, [workItems.data]);

  return (
    <div className="p-6">
      <div>
        <div className="text-lg font-bold">
          {totalCycleTime.map(prettyMS).getOr('-')}{' '}
          <span className="text-base font-normal text-theme-helptext inline-block pl-1">
            {workItems.data?.length} items
          </span>
        </div>
      </div>
      PopupBubbleGraph {type} {workItemConfig.name[1]}
    </div>
  );
};

export default PopupBubbleGraph;
