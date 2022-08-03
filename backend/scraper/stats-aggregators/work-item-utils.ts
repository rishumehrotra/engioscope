import md5 from 'md5';
import { URL } from 'node:url';
import type { WorkItem, WorkItemType } from '../types-azure.js';

const iconColorCache = new Map<string, string>();
export const workItemTypeIconColor = (workItemType: WorkItemType) => {
  if (!iconColorCache.has(workItemType.icon.url)) {
    const { searchParams } = new URL(workItemType.icon.url);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    iconColorCache.set(workItemType.icon.url, searchParams.get('color')!);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return iconColorCache.get(workItemType.icon.url)!;
};

export const workItemTypeId = (workItemType: WorkItemType) => (
  md5(workItemType.name + workItemType.icon.id + workItemTypeIconColor(workItemType))
);

export const closedDate = (workItem: WorkItem) => (
  workItem.fields['Microsoft.VSTS.Common.ClosedDate']
);
