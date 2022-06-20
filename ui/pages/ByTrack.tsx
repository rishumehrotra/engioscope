import { head, last, map } from 'rambda';
import React, { useEffect, useMemo, useState } from 'react';
import type { Tracks, UIWorkItem } from '../../shared/types';
import { divide } from '../../shared/utils';
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
};

const GanttBar: React.FC<GanttBarProps> = ({
  maxTime, stages, tooltip
}) => (
  <ul
    data-tip={tooltip}
    data-html
    className="flex gap-0.5 text-xs font-semibold"
    style={{
      flex: `0 0 ${maxTime}px`
    }}
  >
    {stages.map(({ label, time, color }) => (
      <li
        key={label}
        className="inline-block overflow-hidden whitespace-nowrap text-gray-700 py-0.5 px-1 rounded-full"
        style={{ width: `${(time / maxTime) * 100}%`, backgroundColor: color }}
      >
        {label}
      </li>
    ))}
  </ul>
);

const tooltipFor = (item: UIWorkItem, times: TimeInArea[]) => `
  <span class="font-semibold">${item.title}</span>
  <ul>
    ${times.map(t => `
      <li>
        <span
          class="w-2 h-2 inline-block mr-1"
          style="background: ${t.end ? (t.isWorkCenter ? '#f009' : '#0f8c') : 'yellow'}"
        > </span>
        ${t.label}
        <span class="text-gray-300">
          ${t.end
    ? `${shortDate(t.start)} to ${shortDate(t.end)} (${prettyMS(t.end.getTime() - t.start.getTime())})`
    : `since ${shortDate(t.start)} (${prettyMS(Date.now() - t.start.getTime())})`}
        </span>
      </li>
    `).join('')}
  </ul>
`;

const aggregateTooltiip = (times: Record<string, {
  time: number;
  count: number;
  isWorkCenter: boolean;
}>) => `
  <ul>
    ${Object.entries(times)
    .map(([label, { time, isWorkCenter }]) => `
      <li>
        <span
          class="w-2 h-2 inline-block mr-1"
          style="background: ${isWorkCenter ? '#f009' : '#0f8c'}"
        > </span>
        ${label}
        <span class="text-gray-300">
          ${prettyMS(time)}
        </span>
      </li>
    `).join('')}
  </ul>
`;

const ByTrack: React.FC = () => {
  const [tracks, setTracks] = useState<Tracks | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [inclusions, setInclusions] = useState<'live' | 'live+wip' | 'live+wip+today'>('live');
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
    return map(workItems => ({
      workItems,
      timeSpent: workItems.reduce<Record<number, TimeInArea[]>>((acc, wi) => {
        acc[wi.id] = timeSpent(tracks.times[wi.id]);
        return acc;
      }, {}),
      ts: workItems.map(wi => tracks.times[wi.id])
        .flatMap(timeSpent)
        .reduce<Record<string, { time: number; count: number; isWorkCenter: boolean }>>((acc, times) => {
          acc[times.label] = acc[times.label] || { time: 0, count: 0, isWorkCenter: false };
          if (times.end) {
            acc[times.label].time += times.end
              ? (times.end.getTime() - times.start.getTime())
              : 0;
            acc[times.label].count += times.end ? 1 : 0;
            acc[times.label].isWorkCenter = times.isWorkCenter;
          }
          return acc;
        }, {}),
      times: workItems.reduce<{ workCenters: Record<string, { time: number; count: number }> }>((acc, item) => {
        const times = tracks.times[item.id];
        if (!times) return acc;

        if (inclusions === 'live' && !times.end) return acc;

        times.workCenters.forEach(wc => {
          acc.workCenters[wc.label] = acc.workCenters[wc.label] || {
            time: 0,
            count: 0
          };

          if (inclusions === 'live+wip' && !wc.end) return;

          acc.workCenters[wc.label].time += (
            (wc.end ? new Date(wc.end).getTime() : Date.now())
            - new Date(wc.start).getTime()
          );
          acc.workCenters[wc.label].count += 1;
        });

        return acc;
      }, { workCenters: {} })
    }), tracks.workItems
      .reduce<Record<string, UIWorkItem[]>>((acc, item) => {
        const { track } = item;
        if (!track) return acc;
        acc[track] = acc[track] || [];
        acc[track].push(item);
        return acc;
      }, {}));
  }, [inclusions, tracks]);

  const maxTime = useMemo(() => (
    organisedByTrack
      ? Math.max(...Object.values(organisedByTrack)
        .map(x => Object.values(x.timeSpent))
        .flat()
        .map(ts => {
          const f = head(ts);
          const l = last(ts);
          if (!f || !l) return 0;
          return (l.end?.getTime() || Date.now()) - f.start.getTime();
        }))
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
                  {/* <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      <input
                        type="radio"
                        checked={inclusions === 'live'}
                        onChange={() => setInclusions('live')}
                      />
                      Live only
                    </label>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      <input
                        type="radio"
                        checked={inclusions === 'live+wip'}
                        onChange={() => setInclusions('live+wip')}
                      />
                      Live and WIP
                    </label>
                  </div> */}
                  {Object.entries(organisedByTrack!)
                    .map(([track, {
                      workItems, times, timeSpent, ts
                    }]) => (
                      <details key={track}>
                        <summary>
                          <span className="text-2xl font-bold mb-4">{track}</span>
                          <span>{` ${workItems.length} features`}</span>
                          <GanttBar
                            maxTime={maxTime}
                            stages={Object.entries(ts).map(([label, { time, count, isWorkCenter }]) => ({
                              label,
                              time: divide(time, count).getOr(0),
                              color: isWorkCenter ? '#0f8a' : '#f006'
                            }))}
                            tooltip={aggregateTooltiip(ts)}
                          />
                          <span className="text-gray-600">
                            {Object.entries(times.workCenters).map(([wc, { time }]) => (
                              <span key={wc} className="inline-block mr-2">
                                <span className="text-sm font-bold">{wc}</span>
                                <span className="text-gray-600">
                                  {prettyMS(time)}
                                </span>
                              </span>
                            ))}
                          </span>
                        </summary>
                        <ul className="ml-4">
                          {workItems.map(item => (
                            <li key={item.id} className="mb-2">
                              <a
                                href={item.url}
                                className="link-text inline-block mb-2 font-semibold"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {tracks.times[item.id].end
                                  ? (
                                    <span
                                      className="text-xs uppercase bg-green-600 px-1 py-0.5 inline-block mr-1 text-white rounded-md"
                                    >
                                      Live
                                    </span>
                                  )
                                  : (
                                    <span
                                      className="text-xs uppercase bg-orange-400 px-1 py-0.5 inline-block mr-1 text-white rounded-md"
                                    >
                                      WIP
                                    </span>
                                  )}
                                {item.title}
                              </a>
                              <GanttBar
                                maxTime={maxTime}
                                stages={timeSpent[item.id].map(({
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
