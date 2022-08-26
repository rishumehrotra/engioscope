import { head, identity, last } from 'rambda';
import React, { useMemo, useState } from 'react';
import { asc, byNum } from '../../../shared/sort-utils.js';
import type { TrackFeatures } from '../../../shared/types.js';
import { divide } from '../../../shared/utils.js';
import { MultiSelectDropdownWithLabel } from '../common/MultiSelectDropdown.jsx';
import Switcher from '../common/Switcher.jsx';
import { GanttBar } from './GanttBar';
import { organiseByTrack, aggregateTooltiip, tooltipFor } from './helpers';

const FeaturesList: React.FC<{ tracks: TrackFeatures['tracks'] }> = ({ tracks }) => {
  const [inclusions, setInclusions] = useState<'live' | 'live+wip'>('live');
  const [wipHandling, setWipHandling] = useState<'ignore-last-state' | 'use-today-as-end-date'>('ignore-last-state');
  const [groupId, setGroupId] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>([]);

  const organisedByTrack = useMemo(() => (
    organiseByTrack(tracks, inclusions, wipHandling, groupId, priority)
  ), [groupId, inclusions, priority, tracks, wipHandling]);

  const priorities = useMemo(() => (
    [
      ...Object.values(organisedByTrack).reduce((acc, { workItems }) => {
        workItems.forEach(wi => (wi.priority ? acc.add(wi.priority) : null));
        return acc;
      }, new Set<number>())
    ].sort(asc(byNum(identity)))
  ), [organisedByTrack]);

  const maxTime = useMemo(() => (
    Math.max(
      ...Object.values(organisedByTrack)
        .flatMap(x => Object.values(x.timeSpentById))
        .map(ts => {
          const f = head(ts);
          const l = last(ts);
          if (!f || !l) { return 0; }
          return (l.end?.getTime() || Date.now()) - f.start.getTime();
        })
    )
  ), [organisedByTrack]);

  return (
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

      {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        Object.entries(organisedByTrack!)
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
          ))
      }
    </>
  );
};

export default FeaturesList;
