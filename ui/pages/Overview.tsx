import React from 'react';
import { overview } from '../network';
import useFetchForProject from '../hooks/use-fetch-for-project';
import Loading from '../components/Loading';
import FlowVelocity from '../components/FlowVelocity';

const Overview: React.FC = () => {
  const projectAnalysis = useFetchForProject(overview);

  if (projectAnalysis === 'loading') return <Loading />;

  return <FlowVelocity projectAnalysis={projectAnalysis} />;
};

export default Overview;
