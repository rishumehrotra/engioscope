import createContextState from '../helpers/create-context-state.jsx';
import useQueryParam, { asBoolean, asString } from './use-query-param.js';

const [DateRangeProvider, usePageLoadTime] = createContextState<Date>(new Date());

const useDateRange = () => {
  const [showTimeSelection] = useQueryParam('time', asBoolean);
  const [fromDate] = useQueryParam('range', asString);

  const endDate = usePageLoadTime();

  if (!showTimeSelection) {
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 90);

    return { startDate, endDate };
  }

  if (fromDate === 'last-6-months') {
    const sixMonthsAgo = new Date(endDate);
    sixMonthsAgo.setDate(endDate.getDate() - 175);
    return { startDate: sixMonthsAgo, endDate };
  }

  if (fromDate === 'last-1-month') {
    const oneMonthsAgo = new Date(endDate);
    oneMonthsAgo.setDate(endDate.getDate() - 28);
    return { startDate: oneMonthsAgo, endDate };
  }

  if (fromDate === 'last-2-weeks') {
    const twoWeeksAgo = new Date(endDate);
    twoWeeksAgo.setDate(endDate.getDate() - 14);
    return { startDate: twoWeeksAgo, endDate };
  }

  const threeMonthsAgo = new Date(endDate);
  threeMonthsAgo.setDate(endDate.getDate() - 84);
  return { startDate: threeMonthsAgo, endDate };
};

export { DateRangeProvider, useDateRange };
