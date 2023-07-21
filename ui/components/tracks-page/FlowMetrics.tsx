import { head, last, sum } from 'rambda';
import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import { asc, byNum, byString, desc } from 'sort-lib';
import type { TrackFlowMetrics, TrackMetricsByTrack } from '../../../shared/types.js';
import { divide } from '../../../shared/utils.js';
import { prettyMS } from '../../helpers/utils.js';
import useQueryPeriodDays from '../../hooks/use-query-period-days.js';
import { ArrowDown, ArrowUp } from '../common/Icons.jsx';
import ExtendedLabelWithSparkline from '../graphs/ExtendedLabelWithSparkline.jsx';
import {
  changeLeadTimeSparkline,
  cycleTimeSparkline,
  flowEfficiencySparkline,
  newItemsSparkline,
  velocitySparkline,
  wipTrendSparkline,
} from '../sparkline-props.js';

const createLinkWrapper =
  (
    collectionName: string,
    projectName: string,
    filterLabel: string | undefined,
    trackName: string
  ) =>
  (contents: ReactNode, stub: string) => (
    <a
      href={`/${collectionName}/${projectName}/?filter=${encodeURIComponent(
        `${filterLabel}:${trackName}`
      )}${stub}`}
      target="_blank"
      rel="noreferrer"
    >
      {contents}
    </a>
  );

type FlowMetricsInnerProps = {
  tracks: TrackMetricsByTrack[number];
};

const FlowMetricsInner: React.FC<FlowMetricsInnerProps> = ({ tracks }) => {
  const [queryPeriodDays] = useQueryPeriodDays();

  const table = useMemo(
    () => ({
      columns: [
        null,
        {
          label: 'New',
          tooltip: `Number of new work items added in the last ${queryPeriodDays} days`,
        },
        {
          label: 'Velocity',
          tooltip: `Number of work items completed in the last ${queryPeriodDays} days`,
        },
        {
          label: 'Cycle time',
          tooltip: `Average time taken to complete a work item over the last ${queryPeriodDays} days`,
        },
        {
          label: 'CLT',
          tooltip:
            'Average time taken to take a work item to production after development is complete',
        },
        {
          label: 'Flow efficiency',
          tooltip:
            'Fraction of overall time that work items spend in work centers on average',
        },
        {
          label: 'WIP trend',
          tooltip: `WIP items over the last ${queryPeriodDays} days`,
        },
        { label: 'WIP age', tooltip: 'Average age of work items in progress' },
      ],
      rows: Object.entries(tracks.byTrack)
        .sort(asc(byString(head)))
        .map(([trackName, trackMetrics]) => {
          const withLink = createLinkWrapper(
            tracks.collection,
            tracks.project,
            tracks.filterLabel,
            trackName
          );
          const cycleTimeValue: number =
            sum(trackMetrics.cycleTimeByWeek.slice(-4).flat()) /
            trackMetrics.velocityByWeek.slice(-4).length;
          const cltValue: number =
            sum(trackMetrics.changeLeadTimeByWeek.slice(-4).flat()) /
            trackMetrics.velocityByWeek.slice(-4).length;

          return {
            key: trackName,
            values: [
              { value: trackName, content: trackName },
              {
                value: trackMetrics.new,
                content: withLink(
                  <ExtendedLabelWithSparkline
                    data={trackMetrics.newByWeek}
                    {...newItemsSparkline}
                  />,
                  '#new-work-items'
                ),
              },
              {
                value: trackMetrics.velocity,
                content: withLink(
                  <ExtendedLabelWithSparkline
                    data={trackMetrics.velocityByWeek}
                    {...velocitySparkline}
                  />,
                  '#velocity'
                ),
              },
              {
                value: cycleTimeValue,
                content: withLink(
                  <ExtendedLabelWithSparkline
                    data={trackMetrics.cycleTimeByWeek}
                    {...cycleTimeSparkline}
                  />,
                  '#cycle-time'
                ),
              },
              {
                value: cltValue,
                content: withLink(
                  <ExtendedLabelWithSparkline
                    data={trackMetrics.changeLeadTimeByWeek}
                    {...changeLeadTimeSparkline}
                  />,
                  '#change-lead-time'
                ),
              },
              {
                value: divide(
                  trackMetrics.flowEfficiency.wcTime,
                  trackMetrics.flowEfficiency.total
                ).getOr(0),
                content: withLink(
                  trackMetrics.flowEfficiencyByWeek.some(f => f.total !== 0) ? (
                    <ExtendedLabelWithSparkline
                      data={trackMetrics.flowEfficiencyByWeek}
                      {...flowEfficiencySparkline}
                    />
                  ) : (
                    '-'
                  ),
                  '#flow-efficiency'
                ),
              },
              {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                value: last(trackMetrics.wipTrend)!,
                content: withLink(
                  trackMetrics.wipCount ? (
                    <ExtendedLabelWithSparkline
                      data={trackMetrics.wipTrend}
                      {...wipTrendSparkline}
                    />
                  ) : (
                    '0'
                  ),
                  '#age-of-work-in-progress-features-by-state'
                ),
              },
              {
                value: sum(trackMetrics.wipAge.slice(-4)) / trackMetrics.wipCount,
                content: withLink(
                  divide(sum(trackMetrics.wipAge), trackMetrics.wipCount)
                    .map(prettyMS)
                    .getOr('-'),
                  '#age-of-work-in-progress-items'
                ),
              },
            ],
          };
        }),
    }),
    [
      queryPeriodDays,
      tracks.byTrack,
      tracks.collection,
      tracks.filterLabel,
      tracks.project,
    ]
  );

  const [sort, setSort] = useState<{
    byIndex: number;
    direction: 'asc' | 'desc';
  }>({ byIndex: 0, direction: 'asc' });

  const onColumnClick = useCallback(
    (index: number) => () => {
      setSort(sort => {
        return {
          byIndex: index,

          direction:
            sort.byIndex === index ? (sort.direction === 'asc' ? 'desc' : 'asc') : 'asc',
        };
      });
    },
    []
  );

  return (
    <table className="summary-table">
      <thead>
        <tr>
          {table.columns.map((col, index) => (
            <th
              key={col?.label || 'Name'}
              data-tooltip-id="react-tooltip"
              data-tooltip-content={col?.tooltip}
            >
              {col?.label && (
                <button onClick={onColumnClick(index)}>
                  {col.label}
                  <span className="ml-2 inline-block text-white">
                    {sort.byIndex === index ? (
                      sort.direction === 'asc' ? (
                        <ArrowUp className="w-4" />
                      ) : (
                        <ArrowDown className="w-4" />
                      )
                    ) : (
                      <div className="h-6" />
                    )}
                  </span>
                </button>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows
          .sort(
            (sort.direction === 'asc' ? asc : desc)(
              sort.byIndex === 0
                ? byString(row => row.values[sort.byIndex].value as string)
                : byNum(row => row.values[sort.byIndex].value as number)
            )
          )
          .map(row => (
            <tr key={row.key}>
              {row.values.map((val, index) => (
                <td
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${row.key} ${val.value} ${index}`}
                  className="font-semibold py-3"
                >
                  {val.content}
                </td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  );
};

const FlowMetrics: React.FC<{ tracks: TrackFlowMetrics }> = ({ tracks }) => (
  <>
    {tracks.tracks.map(group => (
      <details
        key={`${group.collection}/${group.project}`}
        open={tracks.tracks.length === 1}
      >
        <summary className="text-xl font-semibold mb-4 cursor-pointer">
          {`${group.collection} / ${group.project}`}
        </summary>

        <FlowMetricsInner tracks={group} />
      </details>
    ))}
  </>
);

export default FlowMetrics;
