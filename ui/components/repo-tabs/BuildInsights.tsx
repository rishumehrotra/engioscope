import prettyMilliseconds from 'pretty-ms';
import type { ReactNode } from 'react';
import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import useQueryPeriodDays from '../../hooks/use-query-period-days.js';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';
import { toPercentage } from '../../../shared/utils.js';
import noTasks from './no-tasks.svg';

type CardProps<T extends object> = {
  title: string;
  subtitle: string;
  colHeader: string;
  data: T[] | undefined;
  formatter: (x: T) => { col1: ReactNode; col2: ReactNode; key: string | number };
  emptyMessage: string;
};

const Card = <T extends object>({
  title,
  subtitle,
  colHeader,
  data,
  formatter,
  emptyMessage,
}: CardProps<T>) => {
  return (
    <div className="rounded-lg bg-theme-page-content border border-theme-seperator">
      <div className="p-4 border-b border-b-theme-seperator">
        <h3 className="font-medium text-md">{title}</h3>
        <div className="text-theme-helptext text-sm grid grid-flow-col justify-between">
          <div>{subtitle}</div>
          <div>{data?.length === 0 ? '' : colHeader}</div>
        </div>
      </div>
      {data?.length === 0 ? (
        <div className="text-center p-12">
          <img src={noTasks} alt="No tasks" className="inline-block mb-4" />
          <div className="w-56 m-auto text-sm">{emptyMessage}</div>
        </div>
      ) : (
        <table className="text-sm w-full">
          <thead className="sr-only">
            <tr>
              <th> </th>
              <th className="text-center">{colHeader}</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((task, index) => {
              const { col1, col2, key } = formatter(task);
              return (
                <tr
                  key={key}
                  className={index === 0 ? '' : 'border-t border-t-theme-seperator-light'}
                >
                  <td className="pl-4 py-3">{col1}</td>
                  <td className="pr-4 py-3 text-right whitespace-nowrap align-top">
                    {col2}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

const BuildInsights: React.FC<{
  buildDefinitionId: number;
}> = ({ buildDefinitionId }) => {
  const cnp = useCollectionAndProject();
  const timelineStats = trpc.builds.timelineStats.useQuery({
    ...cnp,
    buildDefinitionId,
  });
  const [queryPeriodDays] = useQueryPeriodDays();

  return (
    <div className="grid grid-cols-3 gap-5 p-5 bg-gray-100">
      <Card
        title="Slowest tasks"
        subtitle="Tasks that take &gt; 30 seconds"
        data={timelineStats.data?.slowest}
        colHeader="Avg time"
        formatter={x => ({ key: x.name, col1: x.name, col2: prettyMilliseconds(x.time) })}
        emptyMessage={`No tasks took longer than 30s to complete in the last ${queryPeriodDays} days`}
      />
      <Card
        title="Frequently failing tasks"
        subtitle="Tasks that have a failure rate > 5%"
        data={timelineStats.data?.failing}
        colHeader="Failure rate"
        formatter={x => ({
          key: x.name,
          col1: (
            <>
              {x.name}
              {x.continueOnError ? (
                <span
                  className="bg-orange-500 rounded-full w-2 h-2 inline-block ml-2"
                  data-tooltip-id="react-tooltip"
                  data-tooltip-content="This task is configured to continue on error"
                />
              ) : null}
            </>
          ),
          col2: toPercentage(x.failureRate),
        })}
        emptyMessage={`No task had a significant failure rate in the last ${queryPeriodDays} days`}
      />
      <Card
        title="Frequently skipped"
        subtitle="Tasks that are skipped frequently"
        data={timelineStats.data?.skipped}
        colHeader="Skip rate"
        formatter={x => ({
          key: x.name,
          col1: x.name,
          col2: `${(x.skippedPercentage * 100).toFixed(2)}%`,
        })}
        emptyMessage={`No tasks were skipped in the last ${queryPeriodDays} days`}
      />
    </div>
  );
};

export default BuildInsights;
