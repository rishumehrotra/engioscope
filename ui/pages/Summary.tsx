import React, { Fragment, useEffect, useState } from 'react';
import { useQueryParam } from 'use-query-params';
import type { SummaryMetrics } from '../../shared/types';
import SearchInput from '../components/common/SearchInput';
import Header from '../components/Header';
import Loading from '../components/Loading';
import SummaryByTeam from '../components/summary-page/SummaryByTeam';
import { dontFilter, filterBySearch } from '../helpers/utils';
import { metricsSummary } from '../network';

const bySearch = (search: string) => (group: SummaryMetrics['groups'][number]) => filterBySearch(search, group.groupName);

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
        <div className="mx-32  px-8 mt-8 bg-gray-50 grid grid-cols-2 justify-between">
          <div>
            {show ? (
              <>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label>
                  <input type="radio" checked={!show} onClick={() => setShow(undefined, 'replaceIn')} />
                  By team
                </label>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label>
                  <input type="radio" checked={!!show} onClick={() => setShow('by-metric', 'replaceIn')} />
                  By metric
                </label>
              </>
            ) : null}
          </div>
          <div style={{ height: 40 }} className="ml-2 w-60 justify-self-end">
            <SearchInput />
          </div>
        </div>
      ) : null}

      <div className="mx-32 px-8 mt-8 flex justify-between">
        <div className="flex-1 flex flex-wrap">
          {
            metrics?.groups
              ? (
                <>
                  <div className="mr-4 font-semibold">Jump to:</div>
                  {metrics.groups.map(group => (
                    <div className="mb-1" key={group.groupName}>
                      <a className="link-text" href={`#${group.groupName}`}>{group.groupName}</a>
                      <span className="mx-2 text-blue-600">·</span>
                    </div>
                  ))}
                </>
              )
              : null
          }
        </div>
      </div>

      <div className="mx-32">
        {metrics
          ? (
            <SummaryByTeam
              groups={metrics.groups.filter(search ? bySearch(search) : dontFilter)}
              workItemTypes={metrics.workItemTypes}
            />
          )
          : <Loading />}
      </div>
    </>
  );
};

export default Summary;
