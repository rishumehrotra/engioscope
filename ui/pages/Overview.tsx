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
            ([workItemTypeId, velocity]) => (
              <div>
                <img
                  src={projectAnalysis.workItems?.types[workItemTypeId].icon}
                  alt={`Icon for ${projectAnalysis.workItems?.types[workItemTypeId].name[1]}`}
                  width="16"
                  className="inline-block mr-2"
                />
                {`${projectAnalysis.workItems?.types[workItemTypeId].name[1]}: ${velocity} / month`}
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
            ([workItemTypeId, time]) => (
              <div>
                <img
                  src={projectAnalysis.workItems?.types[workItemTypeId].icon}
                  alt={`Icon for ${projectAnalysis.workItems?.types[workItemTypeId].name[1]}`}
                  width="16"
                  className="inline-block mr-2"
                />
                {`${projectAnalysis.workItems?.types[workItemTypeId].name[1]}: ${prettyMilliseconds(time, { compact: true })}`}
              </div>
            )
          )}
        </div>

        <div>
          Flow distribution:
          {Object.entries(projectAnalysis.workItems?.flowMetrics.velocity || {}).map(
            ([workItemTypeId, velocity]) => (
              <div>
                <img
                  src={projectAnalysis.workItems?.types[workItemTypeId].icon}
                  alt={`Icon for ${projectAnalysis.workItems?.types[workItemTypeId].name[1]}`}
                  width="16"
                  className="inline-block mr-2"
                />
                {`${projectAnalysis.workItems?.types[workItemTypeId].name[1]}: ${((velocity * 100) / totalWorkItems).toFixed(2)}%`}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
};

export default Overview;

