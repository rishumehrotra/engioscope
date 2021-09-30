import type { UIWorkItem } from '../../shared/types';

export const getCLTTime = (workItem: UIWorkItem) => (
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  new Date(workItem.clt!.end!).getTime() - new Date(workItem.clt!.start!).getTime()
);
export const getLeadTime = (workItem: UIWorkItem) => (
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  new Date(workItem.leadTime!.end!).getTime() - new Date(workItem.leadTime!.start!).getTime()
);
export const hasCLT = (workItem: UIWorkItem) => {
  if (!workItem.clt) return false;
  if (!workItem.clt.start) return false;
  if (!workItem.clt.end) return false;
  return true;
};
export const hasLeadTime = (workItem: UIWorkItem) => {
  if (!workItem.leadTime) return false;
  if (!workItem.leadTime.end) return false;
  return true;
};

export const workItemByIdUsing = (byId: Record<number, UIWorkItem>) => (
  (id: number) => byId[id]
);
