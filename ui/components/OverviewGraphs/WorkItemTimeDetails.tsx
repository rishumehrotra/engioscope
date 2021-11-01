import prettyMilliseconds from 'pretty-ms';
import { last, prop } from 'rambda';
import React from 'react';
import type { Overview, UIWorkItem } from '../../../shared/types';
import { timeDifference } from './helpers';

type WorkItemTimeDetailsProps = {
  workItem: UIWorkItem;
  workItemTimes: (wid: number) => Overview['times'][number];
};

export const WorkItemTimeDetails: React.FC<WorkItemTimeDetailsProps> = ({ workItem, workItemTimes }) => {
  const times = workItemTimes(workItem.id);

  const workingTime = prettyMilliseconds(
    times.workCenters.reduce((acc, wc) => acc + timeDifference(wc), 0),
    { compact: true }
  );

  const showTimeSplit = (split: { label: string; timeDiff: number }[]) => {
    const maxTimeDiff = Math.max(...split.map(prop('timeDiff')));

    return (
      <ul className="inline">
        {split.map(({ label, timeDiff }, index) => (
          <li key={label} className="inline">
            {index !== 0 && ' + '}
            {timeDiff === maxTimeDiff
              ? (
                <strong className="font-semibold">
                  {`${label}: ${prettyMilliseconds(timeDiff, { compact: true })}`}
                </strong>
              )
              : (
                `${label}: ${prettyMilliseconds(timeDiff, { compact: true })}`
              )}
          </li>
        ))}
      </ul>
    );
  };

  const lastWorkCenter = last(times.workCenters);

  const waitingTime = times.workCenters.length > 1
    ? prettyMilliseconds(
      times.workCenters.slice(1).reduce(
        (acc, wc, index) => acc + timeDifference({
          start: times.workCenters[index].end || new Date().toISOString(),
          end: wc.start
        }), 0
      ) + (
        // Time after last work center
        lastWorkCenter.end && lastWorkCenter.end !== times.end
          ? timeDifference({ start: lastWorkCenter.end, end: times.end })
          : 0
      ),
      { compact: true }
    )
    : 'unknown';

  return (
    <div className="text-gray-500 text-sm ml-6 mb-3">
      {`Total working time: ${workingTime} (`}
      {showTimeSplit(times.workCenters.map(wc => ({
        label: `${wc.label} time`,
        timeDiff: timeDifference(wc)
      })))}
      )
      <br />
      {`Total waiting time: ${waitingTime} (`}
      {times.workCenters.length === 1
        ? 'unknown'
        : showTimeSplit([
          ...times.workCenters.slice(1).map((wc, index) => ({
            label: `${times.workCenters[index].label} to ${wc.label}`,
            timeDiff: timeDifference({
              start: times.workCenters[index].end || new Date().toISOString(),
              end: wc.start
            })
          })),
          ...(times.end !== lastWorkCenter.end
            ? [{
              label: `After ${lastWorkCenter.label}`,
              timeDiff: timeDifference({
                start: lastWorkCenter.end || new Date().toISOString(),
                end: times.end
              })
            }]
            : [])
        ])}
      )
    </div>
  );
};
