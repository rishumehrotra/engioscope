import { pipe, prop } from 'rambda';
import { count, incrementBy } from './reducer-utils';
import type { Overview, UIWorkItem } from './types';

type WorkItemTimes = Overview['times'][number];
type WorkItemTimesGetter = (wi: UIWorkItem) => WorkItemTimes;

export const timeDifference = ({ start, end }: { start: string; end?: string }) => (
  (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()
);

export const cycleTime = (workItemTimes: WorkItemTimesGetter) => (
  (wi: UIWorkItem) => {
    const wit = workItemTimes(wi);
    if (!wit.start || !wit.end) return;
    return new Date(wit.end).getTime() - new Date(wit.start).getTime();
  }
);

export const workCenterTime = (workItemTimes: WorkItemTimesGetter) => pipe(
  workItemTimes,
  prop('workCenters'),
  count(incrementBy(wc => (wc.end ? timeDifference(wc) : 0)))
);

export const totalCycleTime = (workItemTimes: WorkItemTimesGetter) => (
  count<UIWorkItem>(incrementBy(wi => cycleTime(workItemTimes)(wi) || 0))
);

export const totalWorkCenterTime = (workItemTimes: WorkItemTimesGetter) => (
  count(incrementBy(workCenterTime(workItemTimes)))
);

export const flowEfficiency = (workItemTimes: WorkItemTimesGetter) => {
  const tct = totalCycleTime(workItemTimes);
  const twct = totalWorkCenterTime(workItemTimes);

  return (workItems: UIWorkItem[]) => {
    const totalTime = tct(workItems);
    if (totalTime === 0) return 0;
    return (twct(workItems) * 100) / totalTime;
  };
};
