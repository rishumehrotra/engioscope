import React, { useEffect, useState } from 'react';
import type { SummaryMetrics } from '../../shared/types';
import Switcher from '../components/common/Switcher';
import Header from '../components/Header';
import Loading from '../components/Loading';
import SummaryByMetric from '../components/summary-page/SummaryByMetric';
import SummaryByTeam from '../components/summary-page/SummaryByTeam';
import { dontFilter, filterBySearch, shortDate } from '../helpers/utils';
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

  return (
    <>
      <Header
        title="Metrics summary"
        lastUpdated={metrics ? new Date(metrics.lastUpdateDate) : null}
      />

      {metrics ? (
        <div className="mx-32 mt-8 bg-gray-50 grid grid-cols-2">
          <div>
            <strong className="font-semibold">
              Reporting period:
            </strong>
            {` From ${shortDate(threeMonthsAgo(metrics.lastUpdateDate))} to ${shortDate(new Date(metrics.lastUpdateDate))}.`}
          </div>
          <div className="text-right justify-self-end">
            <div className="flex items-center">
              <span className="inline-block pr-2 uppercase text-xs font-semibold">View by</span>
              <Switcher
                options={[
                  { label: 'Teams', value: 'teams' },
                  { label: 'Metric', value: 'metric' }
                ]}
                onChange={value => setShow(value === 'teams' ? undefined : value, true)}
                value={show === undefined ? 'teams' : show}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-32">
        {/* eslint-disable-next-line no-nested-ternary */}
        {metrics
          ? (
            show
              ? (
                <SummaryByMetric
                  groups={metrics.groups.filter(search ? bySearch(search) : dontFilter)}
                  workItemTypes={metrics.workItemTypes}
                />
              ) : (
                <SummaryByTeam
                  groups={metrics.groups.filter(search ? bySearch(search) : dontFilter)}
                  workItemTypes={metrics.workItemTypes}
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
