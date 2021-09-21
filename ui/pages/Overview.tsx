import React from 'react';
import prettyMilliseconds from 'pretty-ms';
import { add } from 'rambda';
import { workItemMetrics } from '../network';
import useFetchForProject from '../hooks/use-fetch-for-project';
import Loading from '../components/Loading';

const Overview: React.FC = () => {
  const projectAnalysis = useFetchForProject(workItemMetrics);

  if (projectAnalysis === 'loading') return <Loading />;

  const totalWorkItems = Object.values(projectAnalysis.workItems?.flowMetrics.velocity || {}).reduce(add, 0);

  return (
    <>
      <div className="flex justify-between items-center my-3 w-full -mt-5">
        Flow metrics

        <div>
          Flow velocity:
          {Object.entries(projectAnalysis.workItems?.flowMetrics.velocity || {}).map(
            ([workItemType, velocity]) => (
              <div>
                {`${workItemType}: ${velocity} / month`}
              </div>
            )
          )}
          <div>
            Total:
            {' '}
            {totalWorkItems}
          </div>
        </div>

        <div>
          Flow time:
          {Object.entries(projectAnalysis.workItems?.flowMetrics.time || {}).map(
            ([workItemType, time]) => (
              <div>
                {`${workItemType}: ${prettyMilliseconds(time, { compact: true })}`}
              </div>
            )
          )}
        </div>

        <div>
          Flow distribution:
          {Object.entries(projectAnalysis.workItems?.flowMetrics.velocity || {}).map(
            ([workItemType, velocity]) => (
              <div>
                {`${workItemType}: ${((velocity * 100) / totalWorkItems).toFixed(2)}%`}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
};

export default Overview;

