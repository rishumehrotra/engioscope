import React, { useMemo } from 'react';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import { useCollectionAndProject } from '../hooks/query-hooks.js';
import { trpc } from '../helpers/trpc.js';
import Loading from '../components/Loading.jsx';
import { num, prettyMS } from '../helpers/utils.js';
import { toPercentage } from '../../shared/utils.js';

const BuildTimelines: React.FC = () => {
  const cnp = useCollectionAndProject();
  const [queryPeriodDays] = useQueryPeriodDays();

  const queryFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - queryPeriodDays);
    return d;
  }, [queryPeriodDays]);

  const allTimelines = trpc.builds.allTimelineStats.useQuery({
    ...cnp,
    queryFrom,
  });

  if (!allTimelines.data) return <Loading />;

  return (
    <>
      <h2>{`Analysed ${num(allTimelines.data.count)} runs`}</h2>
      <div className="flex gap-4">
        <div>
          <h3 className="text-xl">Slowest tasks</h3>
          <table className="table">
            <thead>
              <tr>
                <td>Name</td>
                <td>Time taken</td>
              </tr>
            </thead>
            <tbody>
              {allTimelines.data.slowest.map(item => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{prettyMS(item.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="text-xl">High failure rate</h3>
          {allTimelines.data.failing.length === 0 ? (
            'No stages failed > 5% of the time'
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <td>Name</td>
                  <td>Failure rate</td>
                </tr>
              </thead>
              <tbody>
                {allTimelines.data.failing.map(item => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{toPercentage(item.failureRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <h3 className="text-xl">Frequently skipped</h3>
          <table className="table">
            <thead>
              <tr>
                <td>Name</td>
                <td>Time taken</td>
              </tr>
            </thead>
            <tbody>
              {allTimelines.data.skipped.map(item => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{toPercentage(item.skippedPercentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default BuildTimelines;
