import React, { useEffect, useState } from 'react';
import type { SummaryMetrics } from '../../shared/types';
import ChangeProgramNavBar from '../components/ChangeProgramNavBar';
import Switcher from '../components/common/Switcher';
import Loading from '../components/Loading';
import SummaryByMetric from '../components/summary-page/SummaryByMetric';
import SummaryByTeam from '../components/summary-page/SummaryByTeam';
import { dontFilter, filterBySearch, shortDate } from '../helpers/utils';
import { useSetHeaderDetails } from '../hooks/header-hooks';
import useQueryParam, { asString } from '../hooks/use-query-param';
import { metricsSummary } from '../network';

const bySearch = (search: string) => (group: SummaryMetrics['groups'][number]) => filterBySearch(search, group.groupName);

const threeMonthsAgo = (date: string) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 3);
  return d;
};

const Summary: React.FC = () => {
  const [metrics, setMetrics] = useState<SummaryMetrics | undefined>();
  useEffect(() => { metricsSummary().then(setMetrics); }, []);
  const [search] = useQueryParam('search', asString);
  const [show, setShow] = useQueryParam('show', asString);
  const setHeaderDetails = useSetHeaderDetails();

  useEffect(() => {
    setHeaderDetails({
      globalSettings: metrics,
      title: 'Metrics',
      subtitle: metrics
        ? (
          <div className="text-base mt-2 font-normal text-gray-200">
            <span className="text-lg font-bold">{shortDate(threeMonthsAgo(metrics.lastUpdateDate))}</span>
            {' to '}
            <span className="text-lg font-bold">{shortDate(new Date(metrics.lastUpdateDate))}</span>
          </div>
        )
        : null
    });
  }, [metrics, setHeaderDetails]);

  return (
    <>
      <div className="mx-32 bg-gray-50 rounded-t-lg" style={{ marginTop: '-2.25rem' }}>
        <ChangeProgramNavBar
          right={(
            <div className="flex items-center">
              <span className="inline-block pr-2 text-right uppercase text-xs font-semibold w-20">View by</span>
              <Switcher
                options={[
                  { label: 'Teams', value: 'teams' },
                  { label: 'Metric', value: 'metric' }
                ]}
                onChange={value => setShow(value === 'teams' ? undefined : value, true)}
                value={show === undefined ? 'teams' : show}
              />
            </div>
          )}
        />
      </div>

      <div className="mx-32">
        {/* eslint-disable-next-line no-nested-ternary */}
        {metrics
          ? (
            show
              ? (
                <SummaryByMetric
                  groups={metrics.groups.filter(search ? bySearch(search) : dontFilter)}
                  workItemTypes={metrics.workItemTypes}
                  queryPeriodDays={metrics.queryPeriodDays}
                />
              ) : (
                <SummaryByTeam
                  groups={metrics.groups.filter(search ? bySearch(search) : dontFilter)}
                  workItemTypes={metrics.workItemTypes}
                  queryPeriodDays={metrics.queryPeriodDays}
                />
              )
          )
          : (
            <div className="my-4">
              <Loading />
            </div>
          )}
      </div>
    </>
  );
};

export default Summary;
