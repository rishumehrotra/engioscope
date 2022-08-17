import { always, map } from 'rambda';
import { asc, byDate } from '../../../shared/sort-utils.js';
import type { Tracks as TTracks, UIWorkItem } from '../../../shared/types.js';
import { divide } from '../../../shared/utils.js';
import { timeSpent } from '../OverviewGraphs/helpers/helpers.js';
import type { TimeInArea } from '../OverviewGraphs/helpers/helpers.js';
import { prettyMS, shortDate } from '../../helpers/utils.js';

export const tooltipFor = (item: UIWorkItem, times: TimeInArea[]) => `
<div class="w-96">
  <span class="font-semibold">${item.title}</span>
  <ul>
    ${times.map(t => {
  // eslint-disable-next-line no-nested-ternary
    const bgColor = t.end ? (t.isWorkCenter ? '#0f8c' : '#f009') : 'yellow';
    return `
      <li>
        <span
          class="w-2 h-2 inline-block mr-1"
          style="background: ${bgColor}"
        > </span>
        ${t.label}
        <span class="text-gray-300">
          ${t.end
    ? `${
      `${shortDate(t.start)}, ${t.start.getFullYear()}`
    } to ${
      `${shortDate(t.end)}, ${t.end.getFullYear()}`
    } (${prettyMS(t.end.getTime() - t.start.getTime())})`
    : `since ${shortDate(t.start)}, ${t.start.getFullYear()} (${prettyMS(Date.now() - t.start.getTime())})`}
        </span>
      </li>
    `;
  }).join('')}
  </ul>
</div>
`;

export const aggregateTooltiip = (times: Record<string, {
  time: number;
  count: number;
  isWorkCenter: boolean;
}>) => `
  <ul>
    ${Object.entries(times)
    .map(([label, { time, isWorkCenter, count }]) => `
      <li>
        <span
          class="w-2 h-2 inline-block mr-1"
          style="background: ${isWorkCenter ? '#0f8c' : '#f009'}"
        > </span>
        ${label}
        <span class="text-gray-300">
          ${prettyMS(divide(time, count).getOr(0))}
        </span>
      </li>
    `).join('')}
  </ul>
`;

export const organiseByTrack = (
  tracks: TTracks,
  inclusions: 'live' | 'live+wip',
  wipHandling: 'ignore-last-state' | 'use-today-as-end-date',
  groupId: string[],
  priority: string[]
) => {
  const workItemsByTrack = tracks.workItems
    .reduce<Record<string, UIWorkItem[]>>((acc, item) => {
      const { track } = item;
      if (!track) { return acc; }
      acc[track] = acc[track] || [];
      acc[track].push(item);
      return acc;
    }, {});

  return map(wis => {
    const workItems = wis
      // ignore items with missing start date for a stage
      .filter(wi => timeSpent(tracks.types[wi.typeId])(tracks.times[wi.id]).every(i => i.start))
      .filter(inclusions === 'live' ? (wi => tracks.times[wi.id].end) : always(true))
      .filter(groupId.length === 0 ? always(true) : (wi => wi.groupId && groupId.includes(wi.groupId)))
      .filter(priority.length === 0 ? always(true) : (wi => wi.priority && priority.includes(String(wi.priority))));

    return {
      workItems: workItems.sort(asc(byDate(x => new Date(x.updated.on)))),
      timeSpentById: workItems.reduce<Record<number, TimeInArea[]>>((acc, wi) => {
        acc[wi.id] = timeSpent(tracks.types[wi.typeId])(tracks.times[wi.id]);
        return acc;
      }, {}),
      timeSpentByCenter: workItems
        .flatMap(wi => timeSpent(tracks.types[wi.typeId])(tracks.times[wi.id]))
        .reduce<Record<string, { time: number; count: number; isWorkCenter: boolean }>>((acc, times) => {
          acc[times.label] = acc[times.label] || { time: 0, count: 0, isWorkCenter: false };
          if (times.end) {
            acc[times.label].time += times.end.getTime() - times.start.getTime();
            acc[times.label].count += 1;
          } else {
            // Last stage hasn't completed
            if (wipHandling === 'ignore-last-state') { return acc; }
            acc[times.label].time += Date.now() - times.start.getTime();
            acc[times.label].count += 1;
          }
          acc[times.label].isWorkCenter = times.isWorkCenter;
          return acc;
        }, {})
    };
  }, workItemsByTrack);
};
