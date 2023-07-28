import { useCallback, useMemo } from 'react';
import useQueryParam, { asBoolean, asString } from '../hooks/use-query-param.js';
import { oneDayInMs } from '../../shared/utils.js';
import InlineSelect from './common/InlineSelect.jsx';

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
      { label: 'last 6 months', value: 'last-6-months', from: sixMonthsAgo },
      { label: 'last 3 months', value: 'last-3-months', from: threeMonthsAgo },
      { label: 'last 1 month', value: 'last-1-month', from: oneMonthsAgo },
      { label: 'last 2 weeks', value: 'last-2-weeks', from: twoWeeksAgo },
    ];
  }, []);

  const onDateRangeChange = useCallback(
    (value: string) => {
      setFromDate(value === 'last-3-months' ? undefined : value, true);
    },
    [setFromDate]
  );

  if (!(showTimeSelection || import.meta.env.DEV)) return null;

  return (
    <div>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="text-theme-helptext inline-flex items-center gap-[0.6ch]">
        <span>Showing data for the</span>
        <InlineSelect
          value={fromDate || 'last-3-months'}
          options={timeOptions}
          onChange={onDateRangeChange}
          className="text-base -mr-2"
        />
      </label>
    </div>
  );
};

export default QueryPeriodSelector;
