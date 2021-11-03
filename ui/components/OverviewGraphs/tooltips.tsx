import prettyMilliseconds from 'pretty-ms';
import type { Overview, UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { timeDifference } from './helpers';

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
  ${workItem.rca ? addSection('RCA', workItem.rca) : ''}
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

export const createCompletedWorkItemTooltip = (
  workItemType: (witId: string) => UIWorkItemType,
  cycleTime: (wid: number) => number | undefined,
  workCenterTime: (wid: number) => number,
  workItemTimes: (wid: number) => Overview['times'][number],
  workItemGroup: (wid: number) => Overview['groups']['string'] | null
) => (workItem: UIWorkItem, additionalSections: { label: string; value: string | number }[] = []) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ct = cycleTime(workItem.id)!;
  const cycleTimeText = prettyMilliseconds(ct, { compact: true });
  const efficiency = Math.round((workCenterTime(workItem.id) / ct) * 100);
  const wit = workItemType(workItem.typeId);

  const worstOffender = computeTimes(workItemTimes(workItem.id).workCenters)
    .sort((a, b) => b.timeDiff - a.timeDiff)[0];

  return `
    <div class="w-72">
      <div class="pl-3" style="text-indent: -1.15rem">
        ${workItemBasicDetails(workItem, wit, workItemGroup(workItem.id)?.name)}
        ${addSection('Cycle Time', cycleTimeText)}
        ${addSection('Longest time', `${worstOffender.label} (${prettyMilliseconds(worstOffender.timeDiff, { compact: true })})`)}
        ${addSection('Efficiency', `${efficiency}%`)}
        ${additionalSections.map(({ label, value }) => addSection(label, value)).join('')}
      </div>
    </div>
  `.trim();
};

export const createWIPWorkItemTooltip = (
  workItemType: (witId: string) => UIWorkItemType,
  workItemTimes: (wid: number) => Overview['times'][number],
  workItemGroup: (wid: number) => Overview['groups']['string'] | null
) => (workItem: UIWorkItem, additionalSections: { label: string; value: string | number }[] = []) => {
  const worstOffender = computeTimes(workItemTimes(workItem.id).workCenters)
    .sort((a, b) => b.timeDiff - a.timeDiff)[0];

  return `
  <div class="w-72">
    <div class="pl-3" style="text-indent: -1.15rem">
      ${workItemBasicDetails(workItem, workItemType(workItem.typeId), workItemGroup(workItem.id)?.name)}
      ${addSection('Current status', workItem.state)}
      ${addSection('Age', prettyMilliseconds(Date.now() - new Date(workItem.created.on).getTime(), { compact: true }))}
      ${worstOffender
    ? addSection('Longest time so far', `${worstOffender.label} (${prettyMilliseconds(worstOffender.timeDiff, { compact: true })})`)
    : ''}
      ${additionalSections.map(({ label, value }) => addSection(label, value)).join('')}
    </div>
  </div>
`.trim();
};
