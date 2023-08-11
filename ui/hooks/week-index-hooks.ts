import { useCallback } from 'react';
import { useQueryContext, useQueryPeriodDays } from './query-hooks.js';

export const useMaxWeekIndex = () => {
  const queryPeriodDays = useQueryPeriodDays();
  return Math.round(queryPeriodDays / 7);
};

export const useDatesForWeekIndex = () => {
  const queryContext = useQueryContext();

  return useCallback(
    (weekIndex: number) => {
      const startDate = new Date(queryContext[2]);
      startDate.setDate(startDate.getDate() + (weekIndex + 0) * 7);
      const endDate = new Date(new Date(startDate).setDate(startDate.getDate() + 7));

      return { startDate, endDate, weekIndex };
    },
    [queryContext]
  );
};
