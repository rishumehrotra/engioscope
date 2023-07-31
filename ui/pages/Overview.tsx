import React from 'react';
import { overview } from '../network.js';
import useFetchForProject from '../hooks/use-fetch-for-project.js';
import Loading from '../components/Loading.js';
import OverviewGraphs from '../components/OverviewGraphs/index.js';
import useQueryParam, { asBoolean } from '../hooks/use-query-param.js';
import OverviewGraphs2 from '../components/OverviewGraphs2/index.jsx';

const Overview: React.FC = () => {
  const projectAnalysis = useFetchForProject(overview);
  const [v2] = useQueryParam<boolean>('v2', asBoolean);

  return projectAnalysis === 'loading' ? (
    <Loading />
  ) : v2 ? (
    <OverviewGraphs2 />
  ) : (
    <OverviewGraphs projectAnalysis={projectAnalysis} />
  );
};

export default Overview;
