import { useCallback, useMemo } from 'react';
import useQueryParam, { asBoolean, asString } from '../hooks/use-query-param.js';
import Select from './common/Select.jsx';
import { oneDayInMs } from '../../shared/utils.js';

const QueryPeriodSelector = () => {
  const [showTimeSelection] = useQueryParam('time', asBoolean);
  const [fromDate, setFromDate] = useQueryParam('range', asString);

  const timeOptions = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setDate(now.getDate() - 180 * oneDayInMs);

    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setDate(now.getDate() - 90 * oneDayInMs);

    const oneMonthsAgo = new Date(now);
    oneMonthsAgo.setDate(now.getDate() - 30 * oneDayInMs);

    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14 * oneDayInMs);

    return [
      { label: 'Last 6 months', value: 'last-6-months', from: sixMonthsAgo },
      { label: 'Last 3 months', value: 'last-3-months', from: threeMonthsAgo },
      { label: 'Last 1 month', value: 'last-1-month', from: oneMonthsAgo },
      { label: 'Last 2 weeks', value: 'last-2-weeks', from: twoWeeksAgo },
    ];
  }, []);

  const onDateRangeChange = useCallback(
    (value: string) => {
      setFromDate(value === 'last-3-months' ? undefined : value, true);
    },
    [setFromDate]
  );

  if (!showTimeSelection) return null;

  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label className="text-gray-600 font-semibold text-sm text-right">
      Showing data for the
      <br />
      <Select
        className="bg-transparent text-gray-900 form-select sm:text-sm font-medium
  focus:shadow-none focus-visible:ring-2 focus-visible:ring-teal-500 border rounded border-gray-400 "
        onChange={onDateRangeChange}
        options={timeOptions}
        value={fromDate || 'last-3-months'}
      />
    </label>
  );
};

export default QueryPeriodSelector;
