import {
  always, head, identity, last, map
} from 'rambda';
import React, { useEffect, useMemo, useState } from 'react';
import { asc, byDate, byNum } from '../../shared/sort-utils';
import type { Tracks, UIWorkItem } from '../../shared/types';
import { divide } from '../../shared/utils';
import { MultiSelectDropdownWithLabel } from '../components/common/MultiSelectDropdown';
import Switcher from '../components/common/Switcher';
import Loading from '../components/Loading';
import type { TimeInArea } from '../components/OverviewGraphs/helpers/helpers';
import { timeSpent } from '../components/OverviewGraphs/helpers/helpers';
import { prettyMS, shortDate } from '../helpers/utils';
import { useSetHeaderDetails } from '../hooks/header-hooks';
import { byTrack } from '../network';

type GanttBarProps = {
  maxTime: number;
  stages: { label: string; time: number; color: string }[];
  tooltip: string;
  className?: string;
};

const GanttBar: React.FC<GanttBarProps> = ({
  maxTime, stages, tooltip, className
}) => (
  <ul
    data-tip={tooltip}
    data-html
    className={`flex gap-0.5 text-xs font-semibold ${className || ''}`}
    style={{
      flex: `0 0 ${maxTime}px`
    }}
  >
    {stages.map(({ label, time, color }) => (
      <li
        key={label}
        className="inline-block overflow-hidden whitespace-nowrap text-gray-700 py-0.5 px-1 rounded"
        style={{ width: `${(time / maxTime) * 100}%`, backgroundColor: color }}
      >
        {label}
      </li>
    ))}
  </ul>
);

const tooltipFor = (item: UIWorkItem, times: TimeInArea[]) => `
<div class="w-96">
  <span class="font-semibold">${item.title}</span>
  <ul>
    ${times.map(t => `
      <li>
        <span
          class="w-2 h-2 inline-block mr-1"
          style="background: ${t.end ? (t.isWorkCenter ? '#0f8c' : '#f009') : 'yellow'}"
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
    `).join('')}
  </ul>
</div>
`;

const aggregateTooltiip = (times: Record<string, {
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

const organiseByTrack = (
  tracks: Tracks,
  inclusions: 'live' | 'live+wip',
  wipHandling: 'ignore-last-state' | 'use-today-as-end-date',
  groupId: string[],
  priority: string[]
) => {
  const workItemsByTrack = tracks.workItems
    .reduce<Record<string, UIWorkItem[]>>((acc, item) => {
      const { track } = item;
      if (!track) return acc;
      acc[track] = acc[track] || [];
      acc[track].push(item);
      return acc;
    }, {});

  return map(wis => {
    const workItems = wis
      .filter(inclusions === 'live' ? (wi => tracks.times[wi.id].end) : always(true))
      .filter(groupId.length === 0 ? always(true) : (wi => wi.groupId && groupId.includes(wi.groupId)))
      .filter(priority.length === 0 ? always(true) : (wi => wi.priority && priority.includes(String(wi.priority))));
    // .filter(wi => wi.priority === 1);
    return {
      workItems: workItems.sort(asc(byDate(x => new Date(x.updated.on)))),
      timeSpentById: workItems.reduce<Record<number, TimeInArea[]>>((acc, wi) => {
        acc[wi.id] = timeSpent(tracks.times[wi.id]);
        return acc;
      }, {}),
      timeSpentByCenter: workItems
        .map(wi => tracks.times[wi.id])
        .flatMap(timeSpent)
        .reduce<Record<string, { time: number; count: number; isWorkCenter: boolean }>>((acc, times) => {
          acc[times.label] = acc[times.label] || { time: 0, count: 0, isWorkCenter: false };
          if (times.end) {
            acc[times.label].time += times.end.getTime() - times.start.getTime();
            acc[times.label].count += 1;
          } else {
            // Last stage hasn't completed
            if (wipHandling === 'ignore-last-state') return acc;
            acc[times.label].time += Date.now() - times.start.getTime();
            acc[times.label].count += 1;
          }
          acc[times.label].isWorkCenter = times.isWorkCenter;
          return acc;
        }, {})
    };
  }, workItemsByTrack);
};

const ByTrack: React.FC = () => {
  const [tracks, setTracks] = useState<Tracks | null>(null);

  const [inclusions, setInclusions] = useState<'live' | 'live+wip'>('live');
  const [wipHandling, setWipHandling] = useState<'ignore-last-state' | 'use-today-as-end-date'>('ignore-last-state');
  const [groupId, setGroupId] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>([]);

  useEffect(() => { byTrack().then(setTracks); }, []);
  const setHeaderDetails = useSetHeaderDetails();

  useEffect(() => {
    setHeaderDetails({
      globalSettings: tracks,
      title: 'Progress'
    });
  }, [tracks, setHeaderDetails]);

  const organisedByTrack = useMemo(() => {
    if (!tracks) return null;
    return organiseByTrack(tracks, inclusions, wipHandling, groupId, priority);
  }, [groupId, inclusions, priority, tracks, wipHandling]);

  const priorities = useMemo(() => {
    if (!organisedByTrack) return null;
    return [
      ...Object.values(organisedByTrack).reduce((acc, { workItems }) => {
        workItems.forEach(wi => (wi.priority ? acc.add(wi.priority) : null));
        return acc;
      }, new Set<number>())
    ].sort(asc(byNum(identity)));
  }, [organisedByTrack]);

  const maxTime = useMemo(() => (
    organisedByTrack
      ? Math.max(
        ...Object.values(organisedByTrack)
          .map(x => Object.values(x.timeSpentById))
          .flat()
          .map(ts => {
            const f = head(ts);
            const l = last(ts);
            if (!f || !l) return 0;
            return (l.end?.getTime() || Date.now()) - f.start.getTime();
          })
      )
      : 0
  ), [organisedByTrack]);

  return (
    <div className="mx-32">
      {!tracks
        ? <Loading />
        : (
          <div className="mt-8 bg-gray-50">
            {!tracks.workItems.length
              ? 'Tracks not configured'
              : (
                <>
                  <div className="flex items-end gap-4">
                    <MultiSelectDropdownWithLabel
                      label="Feature type"
                      onChange={setGroupId}
                      options={Object.entries(tracks.groups).map(([id, { name }]) => ({
                        label: name,
                        value: id
                      }))}
                      value={groupId}
                    />

                    {priorities?.length && (
                      <MultiSelectDropdownWithLabel
                        label="Priority"
                        onChange={setPriority}
                        options={priorities.map(p => ({ label: String(p), value: String(p) }))}
                        value={priority}
                      />
                    )}

                    <Switcher
                      onChange={setInclusions}
                      options={[
                        { label: 'Live', value: 'live' },
                        { label: 'Live + WIP', value: 'live+wip' }
                      ]}
                      value={inclusions}
                    />

                    {inclusions === 'live+wip' && (
                      <Switcher
                        onChange={setWipHandling}
                        options={[
                          { label: 'Ignore incomplete stage', value: 'ignore-last-state' },
                          { label: 'Use today as end date', value: 'use-today-as-end-date' }
                        ]}
                        value={wipHandling}
                      />
                    )}
                  </div>

                  {Object.entries(organisedByTrack!)
                    .filter(([, { workItems }]) => workItems.length > 0)
                    .map(([track, {
                      workItems, timeSpentById: timeSpent, timeSpentByCenter: ts
                    }]) => (
                      <details key={track} className="my-6">
                        <summary>
                          <span className="text-2xl font-bold mb-4">{track}</span>
                          <span>{` ${workItems.length} features`}</span>
                          <GanttBar
                            maxTime={maxTime}
                            className="ml-4"
                            stages={Object.entries(ts).map(([label, { time, count, isWorkCenter }]) => ({
                              label,
                              time: divide(time, count).getOr(0),
                              color: isWorkCenter ? '#0f8a' : '#f006'
                            }))}
                            tooltip={aggregateTooltiip(ts)}
                          />
                        </summary>
                        <ul className="ml-4">
                          {workItems.map(item => (
                            <li key={item.id} className="mt-4 mb-4">
                              <a
                                href={item.url}
                                className="link-text inline-flex mb-2 font-semibold gap-1 items-center"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={tracks.types[item.typeId].icon}
                                  width="16"
                                  alt={`${tracks.types[item.typeId].name[1]} icon`}
                                />
                                {item.title}
                                {tracks.times[item.id].end
                                  ? (
                                    <span
                                      className="text-xs uppercase bg-green-600 px-1 py-0.5 inline-block ml-1 text-white rounded-md"
                                    >
                                      Live
                                    </span>
                                  )
                                  : (
                                    <span
                                      className="text-xs uppercase bg-orange-400 px-1 py-0.5 inline-block ml-1 text-white rounded-md"
                                    >
                                      WIP
                                    </span>
                                  )}
                              </a>
                              <GanttBar
                                maxTime={maxTime}
                                className="ml-6"
                                stages={timeSpent[item.id]
                                  .filter(x => (!(!x.end && wipHandling === 'ignore-last-state')))
                                  .map(({
                                    label, start, end, isWorkCenter
                                  }) => ({
                                    label,
                                    time: (end ? new Date(end).getTime() : Date.now())
                                    - new Date(start).getTime(),
                                    color: isWorkCenter ? '#0f8a' : '#f006'
                                  }))}
                                tooltip={tooltipFor(item, timeSpent[item.id])}
                              />
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                </>
              )}
          </div>
        )}
    </div>
  );
};

export default ByTrack;
