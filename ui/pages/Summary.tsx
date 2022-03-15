import React, { useEffect, useState } from 'react';
import { useQueryParam } from 'use-query-params';
import type { SummaryMetrics } from '../../shared/types';
import Header from '../components/Header';
import Loading from '../components/Loading';
import SummaryByMetric from '../components/summary-page/SummaryByMetric';
import SummaryByTeam from '../components/summary-page/SummaryByTeam';
import { dontFilter, filterBySearch, shortDate } from '../helpers/utils';
import { metricsSummary } from '../network';

const bySearch = (search: string) => (group: SummaryMetrics['groups'][number]) => filterBySearch(search, group.groupName);

const monthAgo = (date: string) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 1);
  return d;
};

const Summary: React.FC = () => {
  const [metrics, setMetrics] = useState<SummaryMetrics | undefined>();
  useEffect(() => { metricsSummary().then(setMetrics); }, []);
  const [search] = useQueryParam<string>('search');
  const [show, setShow] = useQueryParam<string | undefined>('show');

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
            {` From ${shortDate(monthAgo(metrics.lastUpdateDate))} to ${shortDate(new Date(metrics.lastUpdateDate))}.`}
          </div>
          <div className="text-right">
            <div>
              <span className="inline-block pr-2 uppercase text-xs font-semibold">View by</span>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                className={`rounded-l-md ${show ? 'bg-gray-200 hover:bg-gray-300 cursor-pointer' : 'bg-yellow-500'} px-5 py-1`}
              >
                <input
                  type="radio"
                  checked={!show}
                  onChange={() => setShow(undefined, 'replaceIn')}
                  className="opacity-0 w-0"
                />
                Teams
              </label>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                className={`rounded-r-md ${!show ? 'bg-gray-200 hover:bg-gray-300 cursor-pointer' : 'bg-yellow-500'} px-5 py-1`}
              >
                <input
                  type="radio"
                  checked={!!show}
                  onChange={() => setShow('by-metric', 'replaceIn')}
                  className="opacity-0 w-0"
                />
                Metrics
              </label>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-32">
        {metrics
          ? (
            <div>
              {show
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
                )}
            </div>
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
