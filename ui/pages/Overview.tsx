import React from 'react';
import { overview } from '../network';
import useFetchForProject from '../hooks/use-fetch-for-project';
import Loading from '../components/Loading';

const Overview: React.FC = () => {
  const projectAnalysis = useFetchForProject(overview);

  if (projectAnalysis === 'loading') return <Loading />;

  // const totalWorkItems = Object.values(projectAnalysis.workItems?.flowMetrics.velocity || {}).reduce(add, 0);

  return (
    <>
      <h1>Overview</h1>
    </>
  );
};

export default Overview;

