import React, { useMemo } from 'react';
import type { UIWorkItem } from '../../../shared/types';
import { prettyMS } from '../../helpers/utils';
import useQueryParams from '../../hooks/use-query-params';
import type { WorkItemAccessors } from './helpers/helpers';

type ReleaseSizeAndFrequencyProps = {
  workItems: UIWorkItem[];
  accessors: WorkItemAccessors;
  // openModal: (x: ModalArgs) => void;
};

const ReleaseSizeAndFrequency: React.FC<ReleaseSizeAndFrequencyProps> = ({ workItems, accessors }) => {
  const { isWorkItemClosed, workItemTimes, cycleTime } = accessors;
  const queryParams = useQueryParams();

  const preFilteredWorkItems = useMemo(
    () => workItems.filter(isWorkItemClosed),
    [isWorkItemClosed, workItems]
  );

  const groupByIterationPath = useMemo(
    () => preFilteredWorkItems.reduce<Record<string, UIWorkItem[]>>((acc, wi) => {
      if (!acc[wi.iterationPath]) acc[wi.iterationPath] = [];
      acc[wi.iterationPath].push(wi);
      return acc;
    }, {}),
    [preFilteredWorkItems]
  );

  if (!queryParams['release-size-and-frequency']) return null;

  return (
    <table>
      <thead>
        <tr>
          <th>Iteration Path</th>
          <th>Number of work items</th>
          <th>Max closed date</th>
          <th>Min closed date</th>
          <th>Min cycle time</th>
          <th>Max cycle time</th>
          <th>Work items</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(groupByIterationPath).map(([iterationPath, workItems]) => (
          <tr key={iterationPath}>
            <td>{iterationPath}</td>
            <td>{workItems.length}</td>
            <td>
              {workItems.reduce<Date>((acc, wi) => {
                const closeDate = new Date(workItemTimes(wi).end!);
                if (closeDate > acc) return closeDate;
                return acc;
              }, new Date(0)).toISOString().split('T')[0]}
            </td>
            <td>
              {workItems.reduce<Date>((acc, wi) => {
                const closeDate = new Date(workItemTimes(wi).end!);
                if (closeDate < acc) return closeDate;
                return acc;
              }, new Date()).toISOString().split('T')[0]}
            </td>
            <td>
              {prettyMS(workItems.reduce<number>((acc, wi) => {
                const c = cycleTime(wi)!;
                if (c < acc) return c;
                return acc;
              }, Infinity))}
            </td>
            <td>
              {prettyMS(workItems.reduce<number>((acc, wi) => {
                const c = cycleTime(wi)!;
                if (c > acc) return c;
                return acc;
              }, 0))}
            </td>
            <td>
              {workItems.map(wi => (
                <>
                  <a
                    key={wi.id}
                    href={wi.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500"
                  >
                    {wi.id}
                  </a>
                  {', '}
                </>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ReleaseSizeAndFrequency;
