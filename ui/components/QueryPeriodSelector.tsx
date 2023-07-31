import { useCallback } from 'react';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import InlineSelect from './common/InlineSelect.jsx';

const timeOptions = [
  { label: 'last 6 months', value: 'last-6-months' },
  { label: 'last 3 months', value: 'last-3-months' },
  { label: 'last 1 month', value: 'last-1-month' },
  { label: 'last 2 weeks', value: 'last-2-weeks' },
];

const QueryPeriodSelector = () => {
  const [fromDate, setFromDate] = useQueryParam('range', asString);

  const onDateRangeChange = useCallback(
    (value: string) => {
      setFromDate(value === 'last-3-months' ? undefined : value, true);
    },
    [setFromDate]
  );

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
