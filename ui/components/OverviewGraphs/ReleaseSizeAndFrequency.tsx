import { add } from 'rambda';
import React, { Fragment, useMemo } from 'react';
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
  const {
    isWorkItemClosed, workItemTimes, cycleTime, workItemType, workItemRelations
  } = accessors;
  const queryParams = useQueryParams();

  const preFilteredWorkItems = useMemo(
    () => workItems
      .filter(isWorkItemClosed)
      .filter(wi => workItemType(wi.typeId).name[0] === 'Feature'),
    [isWorkItemClosed, workItemType, workItems]
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
    <table className="w-auto">
      <thead>
        <tr>
          <th>Iteration Path</th>
          <th>Number of features</th>
          <th>Min closed date</th>
          <th>Max closed date</th>
          <th>Min cycle time</th>
          <th>Max cycle time</th>
          <th>Number of bugs</th>
          <th>Features</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(groupByIterationPath).map(([iterationPath, workItems], index) => (
          <tr key={iterationPath} className={`${index % 2 ? 'bg-gray-200' : ''}`}>
            <td>{iterationPath}</td>
            <td>{workItems.length}</td>
            <td>
              {workItems.reduce<Date>((acc, wi) => {
                const closeDate = new Date(workItemTimes(wi).end!);
                if (closeDate < acc) return closeDate;
                return acc;
              }, new Date()).toISOString().split('T')[0]}
            </td>
            <td>
              {workItems.reduce<Date>((acc, wi) => {
                const closeDate = new Date(workItemTimes(wi).end!);
                if (closeDate > acc) return closeDate;
                return acc;
              }, new Date(0)).toISOString().split('T')[0]}
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
              {
                workItems
                  .map(wi => workItemRelations(wi).length)
                  .reduce(add)
              }
            </td>
            <td>
              {workItems.map(wi => (
                <Fragment key={wi.id}>
                  <a
                    href={wi.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500"
                  >
                    {wi.id}
                  </a>
                  {', '}
                </Fragment>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ReleaseSizeAndFrequency;
