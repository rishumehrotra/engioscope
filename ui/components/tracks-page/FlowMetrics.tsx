import { head, last, sum } from 'rambda';
import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import {
  asc, byNum, byString, desc
} from '../../../shared/sort-utils.js';
import type { TrackMetrics, TrackFlowMetrics } from '../../../shared/types.js';
import { divide } from '../../../shared/utils.js';
import { prettyMS } from '../../helpers/utils.js';
import { ArrowDown, ArrowUp } from '../common/Icons.jsx';
import ExtendedLabelWithSparkline from '../graphs/ExtendedLabelWithSparkline.jsx';
import {
  changeLeadTimeSparkline, cycleTimeSparkline, flowEfficiencySparkline, newItemsSparkline,
  velocitySparkline, wipTrendSparkline
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

const FlowMetrics: React.FC<{ tracks: TrackFlowMetrics }> = ({ tracks }) => {
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
        const cycleTimeValue: number = sum(trackMetrics.cycleTimeByWeek.slice(-4).flat()) / trackMetrics.velocityByWeek.slice(-4).length;
        const cltValue = sum(trackMetrics.changeLeadTimeByWeek.slice(-4).flat()) / trackMetrics.velocityByWeek.slice(-4).length;

        return ({
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
              value: cycleTimeValue,
              content: withLink(
                <ExtendedLabelWithSparkline
                  data={trackMetrics.cycleTimeByWeek}
                  {...cycleTimeSparkline}
                />,
                '#cycle-time'
              )
            },
            {
              value: cltValue,
              content: withLink(
                <ExtendedLabelWithSparkline
                  data={trackMetrics.changeLeadTimeByWeek}
                  {...changeLeadTimeSparkline}
                />,
                '#change-lead-time'
              )
            },
            {
              value: divide(trackMetrics.flowEfficiency.wcTime, trackMetrics.flowEfficiency.total).getOr(0),
              content: withLink(
                trackMetrics.flowEfficiencyByWeek.some(f => f.total !== 0)
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
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              value: last(trackMetrics.wipTrend)!,
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
              value: sum(trackMetrics.wipAge.slice(-4)) / trackMetrics.wipCount,
              content: withLink(
                divide(sum(trackMetrics.wipAge), trackMetrics.wipCount).map(prettyMS).getOr('-'),
                '#age-of-work-in-progress-items'
              )
            }
          ]
        });
      })
  }), [tracks]);

  const [sort, setSort] = useState<{
    byIndex: number;
    direction: 'asc' | 'desc';
  }>({ byIndex: 0, direction: 'asc' });

  const onColumnClick = useCallback((index: number) => () => {
    setSort(sort => {
      const newSort: typeof sort = ({
        byIndex: index,
        // eslint-disable-next-line no-nested-ternary
        direction: sort.byIndex === index
          ? (sort.direction === 'asc' ? 'desc' : 'asc')
          : 'asc'
      });

      return newSort;
    });
  }, []);

  return (
    <table className="summary-table">
      <thead>
        <tr>
          {table.columns.map((col, index) => (
            <th key={col?.label || 'Name'} data-tip={col?.tooltip}>
              {col?.label && (
                <button
                  onClick={onColumnClick(index)}
                >
                  {col.label}
                  <span className="ml-2 inline-block text-white">
                    {
                    // eslint-disable-next-line no-nested-ternary
                      sort.byIndex === index
                        ? (
                          sort.direction === 'asc'
                            ? <ArrowUp className="w-4" />
                            : <ArrowDown className="w-4" />
                        )
                        : (
                          <div className="h-6" />
                        )
                    }
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
              (sort.byIndex === 0
                ? byString(row => row.values[sort.byIndex].value as string)
                : byNum(row => row.values[sort.byIndex].value as number)
              )
            )
          )
          .map(row => (
            <tr key={row.key}>
              {row.values
                .map((val, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <td key={`${row.key} ${val.value} ${index}`} className="font-semibold py-3">
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
