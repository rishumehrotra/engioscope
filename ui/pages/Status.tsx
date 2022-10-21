import React, { useEffect } from 'react';
import Loading from '../components/Loading.js';
import useUIConfig from '../hooks/use-ui-config.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { trpc } from '../helpers/trpc.js';
import type { MetaData } from '../../backend/meta-data.js';
import { oneHourInMs } from '../../shared/utils.js';
import { prettyMS } from '../helpers/utils.js';

const isHealthy = (metaData: MetaData | undefined) => {
  if (!metaData) return 'loading';

  if (metaData.collections.every(collection => (
    collection.projects.every(project => (
      project.lastBuildUpdateDate && project.lastBuildUpdateDate.getTime() > Date.now() - oneHourInMs
    ))
  ))) {
    return 'healthy';
  }
  return 'lagging';
};

const Status: React.FC = () => {
  const uiConfig = useUIConfig();
  const metaData = trpc.metaData.useQuery();
  const setHeaderDetails = useSetHeaderDetails();

  useEffect(() => {
    setHeaderDetails({
      title: 'Status',
      lastUpdated: new Date().toISOString()
    });
  }, [setHeaderDetails, uiConfig]);

  const healthy = isHealthy(metaData.data);

  return (
    <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
      {!metaData.data
        ? <Loading />
        : (
          <>
            <h1 className="text-3xl text-center p-20">
              Overall status:
              {' '}
              {healthy === 'healthy'
                ? <span className="bg-green-500 p-2 rounded-md">healthy, yay!</span>
                : <span className="bg-orange-400 p-2 rounded-md">lagging, woops!</span> }
            </h1>
            <details className="max-w-4xl m-auto border border-gray-400">
              <summary className="grid justify-between grid-flow-col cursor-pointer p-5 hover:bg-gray-100">
                <div>Project updates</div>
                <div>Healthy</div>
              </summary>

              <table className="table">
                <thead>
                  <tr>
                    <th> </th>
                    <th>Build update</th>
                  </tr>
                </thead>
                <tbody>
                  {metaData.data.collections.map(collection => (
                    collection.projects.map(project => (
                      <tr key={collection.name + project.name}>
                        <td>{`${collection.name}/${project.name}`}</td>
                        <td>
                          {project.lastBuildUpdateDate
                            ? `${prettyMS(Date.now() - project.lastBuildUpdateDate.getTime())} ago`
                            : ''}
                        </td>
                        <td>Healthy</td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
    </div>
  );
};

export default Status;
