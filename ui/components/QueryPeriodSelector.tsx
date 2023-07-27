import type { ChangeEventHandler } from 'react';
import { useCallback, useMemo } from 'react';
import useQueryParam, { asBoolean, asString } from '../hooks/use-query-param.js';
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
      { label: 'last 6 months', value: 'last-6-months', from: sixMonthsAgo },
      { label: 'last 3 months', value: 'last-3-months', from: threeMonthsAgo },
      { label: 'last 1 month', value: 'last-1-month', from: oneMonthsAgo },
      { label: 'last 2 weeks', value: 'last-2-weeks', from: twoWeeksAgo },
    ];
  }, []);

  const onDateRangeChange: ChangeEventHandler<HTMLSelectElement> = useCallback(
    event => {
      setFromDate(
        event.target.value === 'last-3-months' ? undefined : event.target.value,
        true
      );
    },
    [setFromDate]
  );

  if (!(showTimeSelection || import.meta.env.DEV)) return null;

  return (
    <div className="mt-4 ml-1">
      <label className="text-theme-helptext inline-flex items-center gap-2">
        <span>Showing data for the</span>
        {}
        <select value={fromDate || 'last-3-months'} onChange={onDateRangeChange}>
          {timeOptions.map(t => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default QueryPeriodSelector;
