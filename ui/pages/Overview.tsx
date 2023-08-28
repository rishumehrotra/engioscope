import React from 'react';
import useQueryParam, { asBoolean } from '../hooks/use-query-param.js';
import OverviewGraphs2 from '../components/OverviewGraphs2/index.jsx';

const OverviewGraphs = React.lazy(() => import('../components/OverviewGraphs/index.js'));

const Overview: React.FC = () => {
  const [v1] = useQueryParam<boolean>('v1', asBoolean);

  return v1 ? <OverviewGraphs /> : <OverviewGraphs2 />;
};

export default Overview;
