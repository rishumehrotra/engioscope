import { head, prop } from 'rambda';
import type { UIWorkItem, UIWorkItemType, WorkItemTimes } from '../../../../shared/types.js';
import { num, prettyMS, priorityBasedColor } from '../../../helpers/utils.js';
import type { WorkItemAccessors } from './helpers.js';
import { timeSpent } from './helpers.js';
import { timeDifference } from '../../../../shared/work-item-utils.js';
import { byNum, desc } from '../../../../shared/sort-utils.js';
import { divide, exists } from '../../../../shared/utils.js';

export const envRowTooltip = (env: string, successful: number, total: number, pipelineCount: number) => `
  <b>${env}</b><br />
  Successful deployments: <b>${num(successful)}</b><br />
  Total deployments: <b>${num(total)}</b><br />
  Total pipelines: <b>${num(pipelineCount)}</b>
`;

export type TooltipSection = {
  label: string;
  value: string | number;
  graphValue?: number;
  width?: 1 | 2;
};

const addSection = (section: TooltipSection) => `
  <div class="${section.width === 2 ? 'col-span-2' : ''}">
    ${section.label}
    <div class="font-semibold">${section.value}</div>
    ${section.graphValue !== undefined && section.graphValue <= 1
    ? `
    <div class="rounded-md bg-gray-500 mt-1 h-1.5 w-full">
      <div class="bg-gray-300 h-1.5 rounded-md" style="width: ${section.graphValue * 100}%"></div>
    </div>`
    : ''
}
  </div>
`;

const standardSections = (
  workItem: UIWorkItem,
  workItemType: UIWorkItemType,
  workItemGroupName?: string
): (TooltipSection | undefined)[] => [
  workItemGroupName ? { label: workItemType.groupLabel || 'Group', value: workItemGroupName } : undefined,
  workItem.priority
    ? {
      label: 'Priority',
      value: `
        <span
          class='inline-block w-2 h-2 mr-1'
          style='background: ${priorityBasedColor(workItem.priority)}'
        ></span>
        ${workItem.priority}
      `
    } : undefined,
  workItem.severity ? { label: 'Severity', value: workItem.severity } : undefined,
  workItem.rca.length ? { label: 'RCA', value: workItem.rca.join(' / '), width: 2 } : undefined
];

const addSections = (sections: (TooltipSection | undefined)[]) => `
  <div class="grid grid-cols-2 gap-4 my-3">
    ${sections.filter(exists).map(addSection).join('')}
  </div>
`;

const workItemName = (workItem: UIWorkItem, workItemType: UIWorkItemType) => `
  <img src="${workItemType.icon}" width="14" height="14" class="inline -mt-1" />
  <strong>#${workItem.id}: ${workItem.title}</strong>
`;

const computeTimes = (workItemType: UIWorkItemType, times: WorkItemTimes) => (
  timeSpent(workItemType)(times)
    .filter(x => x.start)
    .map(time => ({
      label: time.label,
      timeDiff: timeDifference({ start: time.start.toISOString(), end: time.end?.toISOString() })
    }))
);

export const createCompletedWorkItemTooltip = ({
  workItemType, cycleTime, workCenterTime, workItemTimes, workItemGroup
}: WorkItemAccessors) => (workItem: UIWorkItem, additionalSections: TooltipSection[] = []) => {
  const times = workItemTimes(workItem);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ct = cycleTime(workItem)!;
  const efficiency = Math.round((workCenterTime(workItem) / ct) * 100);
  const wit = workItemType(workItem.typeId);
  const wig = workItem.groupId ? workItemGroup(workItem.groupId) : undefined;

  const clt = times.devComplete
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ? new Date(times.end!).getTime() - new Date(times.devComplete!).getTime()
    : undefined;

  const worstOffender = head(
    computeTimes(wit, times).sort(desc(byNum(prop('timeDiff'))))
  );

  const sections: (TooltipSection | undefined)[] = [
    ...standardSections(workItem, wit, wig?.name),
    { label: 'Cycle time', value: prettyMS(ct) },
    clt ? { label: 'Change lead time', value: prettyMS(clt), graphValue: divide(clt, ct).getOr(undefined) } : undefined,
    worstOffender
      ? {
        label: 'Longest time',
        value: `${worstOffender.label} (${prettyMS(worstOffender.timeDiff)})`,
        graphValue: divide(worstOffender.timeDiff, ct).getOr(undefined)
      } : undefined,
    { label: 'Efficiency', value: `${efficiency}%`, graphValue: efficiency / 100 },
    ...additionalSections
  ];

  return `
    <div class="w-72 pt-2">
      ${workItemName(workItem, wit)}
      ${addSections(sections)}
    </div>
  `.trim();
};

export const createWIPWorkItemTooltip = ({
  workItemType, workItemTimes, workItemGroup
}: WorkItemAccessors) => (workItem: UIWorkItem, additionalSections: TooltipSection[] = []) => {
  const worstOffender = head(
    computeTimes(workItemType(workItem.typeId), workItemTimes(workItem))
      .sort(desc(byNum(prop('timeDiff'))))
  );
  const wig = workItem.groupId ? workItemGroup(workItem.groupId) : undefined;

  const sections = [
    ...standardSections(workItem, workItemType(workItem.typeId), wig?.name),
    { label: 'Current status', value: workItem.state },
    { label: 'Age', value: prettyMS(Date.now() - new Date(workItem.created.on).getTime()) },
    worstOffender
      ? {
        label: 'Longest time so far',
        value: `${worstOffender.label} (${prettyMS(worstOffender.timeDiff)})`,
        graphValue: divide(worstOffender.timeDiff, Date.now() - new Date(workItem.created.on).getTime()).getOr(undefined)
      }
      : undefined,
    ...additionalSections
  ];

  return `
  <div class="w-72 pt-2">
    ${workItemName(workItem, workItemType(workItem.typeId))}
    ${addSections(sections)}
  </div>
`.trim();
};
