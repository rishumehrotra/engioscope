import md5 from 'md5';
import { URL } from 'url';
import type { WorkItemType } from '../types-azure';

export const workItemTypeIconColor = (workItemType: WorkItemType) => {
  const { searchParams } = new URL(workItemType.icon.url);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return searchParams.get('color')!;
};

export const workItemTypeId = (workItemType: WorkItemType) => (
  md5(workItemType.name + workItemType.icon.id + workItemTypeIconColor(workItemType))
);
