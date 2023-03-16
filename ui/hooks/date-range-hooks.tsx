import { oneDayInMs } from '../../shared/utils.js';
import createContextState from '../helpers/create-context-state.js';

const [DateRangeProvider, usePageLoadTime] = createContextState<Date>(new Date());

const useDateRange = () => {
  const endDate = usePageLoadTime();
  const startDate = new Date(endDate);

  startDate.setTime(startDate.getTime() - 90 * oneDayInMs);
  return { startDate, endDate };
};

export { DateRangeProvider, useDateRange };
