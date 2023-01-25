import React, { useEffect, useState } from 'react';
import type { SummaryMetrics } from '../../shared/types.js';
import ChangeProgramNavBar from '../components/ChangeProgramNavBar.js';
import Switcher from '../components/common/Switcher.js';
import Loading from '../components/Loading.js';
import SummaryByMetric from '../components/summary-page/SummaryByMetric.js';
import SummaryByTeam from '../components/summary-page/SummaryByTeam.js';
import { dontFilter, filterBySearch, shortDate } from '../helpers/utils.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import { metricsSummary } from '../network.js';

const bySearch = (search: string) => (group: SummaryMetrics['groups'][number]) =>
  filterBySearch(search, group.groupName);

const threeMonthsAgo = (date: string) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 3);
  return d;
};

const Summary: React.FC = () => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const [metrics, setMetrics] = useState<SummaryMetrics | undefined>();
  useEffect(() => {
    // TODO: Error handling
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    metricsSummary().then(setMetrics);
  }, []);
  const [search] = useQueryParam('search', asString);
  const [show, setShow] = useQueryParam('show', asString);
  const setHeaderDetails = useSetHeaderDetails();

  useEffect(() => {
    setHeaderDetails({
      title: 'Metrics',
      subtitle: metrics ? (
        <div className="text-base mt-2 font-normal text-gray-200">
          <span className="text-lg font-bold">
            {shortDate(threeMonthsAgo(metrics.lastUpdateDate))}
          </span>
          {' to '}
          <span className="text-lg font-bold">
            {shortDate(new Date(metrics.lastUpdateDate))}
          </span>
        </div>
      ) : null,
      lastUpdated: metrics?.lastUpdateDate,
    });
  }, [metrics, setHeaderDetails]);

  return (
    <>
      <div className="mx-32 bg-gray-50 rounded-t-lg" style={{ marginTop: '-2.25rem' }}>
        <ChangeProgramNavBar
          right={
            <div className="flex items-center">
              <span className="inline-block pr-2 text-right uppercase text-xs font-semibold w-20">
                View by
              </span>
              <Switcher
                options={[
                  { label: 'Teams', value: 'teams' },
                  { label: 'Metric', value: 'metric' },
                ]}
                onChange={value => setShow(value === 'teams' ? undefined : value, true)}
                value={show === undefined ? 'teams' : show}
              />
            </div>
          }
        />
      </div>

      <div className="mx-32">
        {}
        {metrics ? (
          show ? (
            <SummaryByMetric
              groups={metrics.groups.filter(search ? bySearch(search) : dontFilter)}
              workItemTypes={metrics.workItemTypes}
              queryPeriodDays={queryPeriodDays}
            />
          ) : (
            <SummaryByTeam
              groups={metrics.groups.filter(search ? bySearch(search) : dontFilter)}
              workItemTypes={metrics.workItemTypes}
              queryPeriodDays={queryPeriodDays}
            />
          )
        ) : (
          <div className="my-4">
            <Loading />
          </div>
        )}
      </div>
    </>
  );
};

export default Summary;
