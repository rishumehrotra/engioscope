import { useParams } from 'react-router-dom';
import useQueryPeriodDays from './use-query-period-days.js';
import { useDateRange } from './date-range-hooks.js';
import type { QueryContext } from '../../backend/models/utils.js';

export const useCollectionAndProject = () => {
  const { collection, project } = useParams<{ collection: string; project: string }>();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { collectionName: collection!, project: project! };
};

export const useQueryPeriod = () => {
  const [queryPeriodDays] = useQueryPeriodDays();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const queryPeriodStart = new Date(startOfDay);
  queryPeriodStart.setDate(queryPeriodStart.getDate() - queryPeriodDays);

  return {
    queryPeriod: [
      queryPeriodStart,
      startOfDay,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ] as [Date, Date, string],
  };
};

export const useQueryContext = () => {
  const { collectionName, project } = useCollectionAndProject();
  const { startDate, endDate } = useDateRange();

  return [collectionName, project, startDate, endDate] as QueryContext;
};
