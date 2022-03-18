import { pipe, prop, T } from 'rambda';
import { count, incrementBy } from './reducer-utils';
import type { UIWorkItem, UIWorkItemType, WorkItemTimes } from './types';

export const noRCAValue = '(empty)';
export const noGroup = 'no-group';

export type WorkItemTimesGetter = (wi: UIWorkItem) => WorkItemTimes;

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

export const isWIPInTimeRange = (
  workItemTimes: WorkItemTimesGetter,
  statesToIgnore: string[]
) => (
  (isWithinTimeRange: (d: Date, limit: 'start' | 'end') => boolean) => (
    (wi: UIWorkItem) => {
      if (statesToIgnore?.includes(wi.state)) return false;

      const { start, end } = workItemTimes(wi);
      if (!start) return false;
      if (!isWithinTimeRange(new Date(start), 'start')) return false;
      if (!end) return true;
      if (isWithinTimeRange(new Date(end), 'end')) return false;
      return true;
    }
  )
);

export const isWIP = (workItemTimes: WorkItemTimesGetter, statesToIgnore: string[]) => (
  isWIPInTimeRange(workItemTimes, statesToIgnore)(T)
);

export const isBug = (workItemType: UIWorkItemType) => (
  workItemType.name[0].toLowerCase().includes('bug')
);

export const isNewInTimeRange = (
  workItemType: (wit: string) => UIWorkItemType,
  workItemTimes: WorkItemTimesGetter
) => (
  (isWithinTimeRange: (d: Date) => boolean) => (
    (wi: UIWorkItem) => (
      isBug(workItemType(wi.typeId))
        ? isWithinTimeRange(new Date(wi.created.on))
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        : Boolean(workItemTimes(wi).start) && isWithinTimeRange(new Date(workItemTimes(wi).start!))
    )
  )
);
