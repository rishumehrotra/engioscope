import { head, sum } from 'rambda';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { asc, byString } from '../../../shared/sort-utils.js';
import type { TrackMetrics, Tracks } from '../../../shared/types.js';
import { divide } from '../../../shared/utils.js';
import { prettyMS } from '../../helpers/utils.js';
import ExtendedLabelWithSparkline from '../graphs/ExtendedLabelWithSparkline.jsx';
import {
  changeLeadTimeSparkline, cycleTimeSparkline, flowEfficiencySparkline, newItemsSparkline, velocitySparkline, wipTrendSparkline
} from '../sparkline-props.js';

const createLinkWrapper = (trackName: string, trackMetrics: TrackMetrics) => (contents: ReactNode, stub: string) => (
  <a
    href={`/${trackMetrics.project[0]}/${trackMetrics.project[1]}/?filter=${
      encodeURIComponent(`Delivery track:${trackName}`)
    }${stub}`}
    target="_blank"
    rel="noreferrer"
  >
    {contents}
  </a>
);

const FlowMetrics: React.FC<{ tracks: Tracks }> = ({ tracks }) => {
  const table = useMemo(() => ({
    columns: [
      null,
      { label: 'New', tooltip: `Number of new work items added in the last ${tracks.queryPeriodDays} days` },
      { label: 'Velocity', tooltip: `Number of work items completed in the last ${tracks.queryPeriodDays} days` },
      { label: 'Cycle time', tooltip: `Average time taken to complete a work item over the last ${tracks.queryPeriodDays} days` },
      { label: 'CLT', tooltip: 'Average time taken to take a work item to production after development is complete' },
      { label: 'Flow efficiency', tooltip: 'Fraction of overall time that work items spend in work centers on average' },
      { label: 'WIP trend', tooltip: `WIP items over the last ${tracks.queryPeriodDays} days` },
      { label: 'WIP age', tooltip: 'Average age of work items in progress' }
    ],
    rows: Object.entries(tracks.tracks)
      .sort(asc(byString(head)))
      .map(([trackName, trackMetrics]) => {
        const withLink = createLinkWrapper(trackName, trackMetrics);

        return ({
          key: trackName,
          values: [
            { value: trackName, content: trackName },
            {
              value: trackMetrics.new,
              content: withLink(
                <ExtendedLabelWithSparkline
                  data={trackMetrics.velocityByWeek}
                  {...newItemsSparkline}
                />,
                '#new-work-items'
              )
            },
            {
              value: trackMetrics.velocity,
              content: withLink(
                <ExtendedLabelWithSparkline
                  data={trackMetrics.velocityByWeek}
                  {...velocitySparkline}
                />,
                '#velocity'
              )
            },
            {
              value: trackMetrics.cycleTimeByWeek.join('.'),
              content: withLink(
                trackMetrics.cycleTime
                  ? (
                    <ExtendedLabelWithSparkline
                      data={trackMetrics.cycleTimeByWeek}
                      {...cycleTimeSparkline}
                    />
                  ) : '-',
                '#cycle-time'
              )
            },
            {
              value: trackMetrics.changeLeadTime.join(','),
              content: withLink(trackMetrics.changeLeadTime
                ? (
                  <ExtendedLabelWithSparkline
                    data={trackMetrics.changeLeadTimeByWeek}
                    {...changeLeadTimeSparkline}
                  />
                )
                : '-',
              '#change-lead-time')
            },
            {
              value: divide(trackMetrics.flowEfficiency.wcTime, trackMetrics.flowEfficiency.total).getOr(0),
              content: withLink(
                trackMetrics.flowEfficiency
                  ? (
                    <ExtendedLabelWithSparkline
                      data={trackMetrics.flowEfficiencyByWeek}
                      {...flowEfficiencySparkline}
                    />
                  )
                  : '-',
                '#flow-efficiency'
              )
            },
            {
              value: trackMetrics.wipCount,
              content: withLink(
                trackMetrics.wipCount
                  ? (
                    <ExtendedLabelWithSparkline
                      data={trackMetrics.wipTrend}
                      {...wipTrendSparkline}
                    />
                  )
                  : '0',
                '#age-of-work-in-progress-features-by-state'
              )
            },
            {
              value: trackMetrics.wipAge.join(','),
              content: withLink(
                divide(sum(trackMetrics.wipAge), trackMetrics.wipCount).map(prettyMS).getOr('-'),
                '#age-of-work-in-progress-items'
              )
            }
          ]
        });
      })
  }), [tracks]);

  return (
    <table className="summary-table">
      <thead>
        <tr>
          {table.columns.map(col => (
            <th key={col?.label}>
              {col?.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map(row => (
          <tr key={row.key}>
            {row.values.map(val => (
              <td key={val.value} className="font-semibold text-xl py-3">
                {val.content}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default FlowMetrics;
