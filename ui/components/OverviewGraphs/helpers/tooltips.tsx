import type { Overview, UIWorkItem, UIWorkItemType } from '../../../../shared/types';
import { prettyMS } from '../../../helpers/utils';
import type { WorkItemAccessors } from './helpers';
import { timeDifference } from '../../../../shared/work-item-utils';

const addSection = (label: string, value: string | number) => `
  <div class="pt-1">
    <strong>${label}:</strong> ${value}
  </div>
`;

const workItemBasicDetails = (workItem: UIWorkItem, workItemType: UIWorkItemType, workItemGroupName?: string) => `
  <img src="${workItemType.icon}" width="14" height="14" class="inline-block -mt-1" />
  <strong>#${workItem.id}:</strong> ${workItem.title}
  ${workItemGroupName ? addSection(workItemType.groupLabel || 'Group', workItemGroupName) : ''}
  ${workItem.priority ? addSection('Priority', workItem.priority) : ''}
  ${workItem.severity ? addSection('Severity', workItem.severity) : ''}
  ${workItem.rca.length ? addSection('RCA', workItem.rca.join(' / ')) : ''}
`;

const computeTimes = (workCenters: Overview['times'][number]['workCenters']) => (
  workCenters.reduce<{ label: string; timeDiff: number }[]>(
    (acc, wc, index, wcs) => {
      acc.push({
        label: wc.label,
        timeDiff: timeDifference(wc)
      });

      if (index !== wcs.length - 1) {
        acc.push({
          label: `${wc.label} to ${wcs[index + 1].label}`,
          timeDiff: timeDifference({ start: wc.end || new Date().toISOString(), end: wcs[index + 1].start })
        });
      }

      return acc;
    },
    []
  )
);

export const createCompletedWorkItemTooltip = ({
  workItemType, cycleTime, workCenterTime, workItemTimes, workItemGroup
}: WorkItemAccessors) => (workItem: UIWorkItem, additionalSections: { label: string; value: string | number }[] = []) => {
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

  const worstOffender = computeTimes(times.workCenters)
    .sort((a, b) => b.timeDiff - a.timeDiff)[0];

  return `
    <div class="w-72">
      <div class="pl-3" style="text-indent: -1.15rem">
        ${workItemBasicDetails(workItem, wit, wig?.name)}
        ${addSection('Cycle Time', prettyMS(ct))}
        ${clt ? addSection('Change lead time', prettyMS(clt)) : ''}
        ${worstOffender ? addSection('Longest time', `${worstOffender.label} (${prettyMS(worstOffender.timeDiff)})`) : ''}
        ${addSection('Efficiency', `${efficiency}%`)}
        ${additionalSections.map(({ label, value }) => addSection(label, value)).join('')}
      </div>
    </div>
  `.trim();
};

export const createWIPWorkItemTooltip = ({
  workItemType, workItemTimes, workItemGroup
}: WorkItemAccessors) => (workItem: UIWorkItem, additionalSections: { label: string; value: string | number }[] = []) => {
  const worstOffender = computeTimes(workItemTimes(workItem).workCenters)
    .sort((a, b) => b.timeDiff - a.timeDiff)[0];
  const wig = workItem.groupId ? workItemGroup(workItem.groupId) : undefined;

  return `
  <div class="w-72">
    <div class="pl-3" style="text-indent: -1.15rem">
      ${workItemBasicDetails(workItem, workItemType(workItem.typeId), wig?.name)}
      ${addSection('Current status', workItem.state)}
      ${addSection('Age', prettyMS(Date.now() - new Date(workItem.created.on).getTime()))}
      ${worstOffender
    ? addSection('Longest time so far', `${worstOffender.label} (${prettyMS(worstOffender.timeDiff)})`)
    : ''}
      ${additionalSections.map(({ label, value }) => addSection(label, value)).join('')}
    </div>
  </div>
`.trim();
};
