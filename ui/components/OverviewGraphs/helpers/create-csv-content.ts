import type { UIWorkItem } from '../../../../shared/types.js';
import type { WorkItemAccessors } from './helpers.js';
import { workItemStateUsing } from './helpers.js';

export const closedWorkItemsCSV = (workItems: UIWorkItem[], accessors: WorkItemAccessors) => (
  workItems.length === 0 ? undefined : [
    [
      'ID',
      'Type',
      'Group',
      'Title',
      'Started on',
      'Completed on',
      'Cycle time (days)',
      'Change lead time (days)',
      'Working time (days)',
      'Waiting time (days)',
      'Priority',
      'URL'
    ],
    ...workItems.map(wi => {
      const { start: s, end: e } = accessors.workItemTimes(wi);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const start = s!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const end = e!;

      return [
        wi.id,
        accessors.workItemType(wi.typeId).name[0],
        wi.groupId ? accessors.workItemGroup(wi.groupId).name : '-',
        wi.title,
        start.split('T')[0],
        end.split('T')[0],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        Math.round(accessors.cycleTime(wi)! / (1000 * 60 * 60 * 24)),
        accessors.workItemTimes(wi).devComplete
          ? Math.round((
            new Date(end).getTime()
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          - new Date(accessors.workItemTimes(wi).devComplete!).getTime()
          ) / (1000 * 60 * 60 * 24))
          : '-',
        Math.round(accessors.workCenterTime(wi) / (1000 * 60 * 60 * 24)),
        Math.round((new Date(end).getTime() - new Date(start).getTime() - accessors.workCenterTime(wi)) / (1000 * 60 * 60 * 24)),
        wi.priority || 'unknown',
        wi.url
      ];
    })
  ]);

export const bugLeakageCSV = (workItems: UIWorkItem[], accessors: WorkItemAccessors) => (
  workItems.length === 0 ? undefined : [
    [
      'ID',
      'Title',
      'Group',
      'Created on',
      'Current state',
      'Priority',
      ...(accessors.workItemType(workItems[0].typeId).rootCauseFields || []),
      'URL'
    ],
    ...workItems.map(wi => [
      wi.id,
      wi.title,
      wi.groupId ? accessors.workItemGroup(wi.groupId).name : '-',
      wi.created.on.split('T')[0],
      wi.state,
      wi.priority || 'unknown',
      ...(wi.rca),
      wi.url
    ])
  ]);

export const wipWorkItemsCSV = (workItems: UIWorkItem[], accessors: WorkItemAccessors) => (
  workItems.length === 0 ? undefined : [
    [
      'ID',
      'Type',
      'Group',
      'Title',
      'Started on',
      'Age (days)',
      'Azure state',
      'Engioscope state',
      'In Engioscope state since (days)',
      'Priority',
      'URL'
    ],
    ...workItems.map(wi => {
      const { start: s } = accessors.workItemTimes(wi);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const start = s!;
      const state = workItemStateUsing(accessors, accessors.workItemType(wi.typeId))(wi);

      return [
        wi.id,
        accessors.workItemType(wi.typeId).name[0],
        wi.groupId ? accessors.workItemGroup(wi.groupId).name : '-',
        wi.title,
        start ? start.split('T')[0] : '-',
        start
          ? Math.round((Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
          : '-',
        wi.state,
        state.state,
        Math.round((Date.now() - new Date(state.since).getTime()) / (1000 * 60 * 60 * 24)),
        wi.priority || 'unknown',
        wi.url
      ];
    })
  ]);
