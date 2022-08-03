import React from 'react';
import { overview } from '../network.js';
import useFetchForProject from '../hooks/use-fetch-for-project.js';
import Loading from '../components/Loading.js';
import OverviewGraphs from '../components/OverviewGraphs/index.js';

const Overview: React.FC = () => {
  const projectAnalysis = useFetchForProject(overview);

  if (projectAnalysis === 'loading') return <Loading />;

  return <OverviewGraphs projectAnalysis={projectAnalysis} />;
};

export default Overview;
