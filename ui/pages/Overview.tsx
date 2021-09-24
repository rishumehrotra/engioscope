import React from 'react';
import { overview } from '../network';
import useFetchForProject from '../hooks/use-fetch-for-project';
import Loading from '../components/Loading';
import type { ProjectOverviewAnalysis, Overview as UIOverview } from '../../shared/types';

const featureTypeCreator = (overview: ProjectOverviewAnalysis['overview']) => (
  (workItemId: number): string | undefined => overview.featureTypes[workItemId]
);

const witIdCreator = (overview: ProjectOverviewAnalysis['overview']) => (
  (workItemId: number) => overview.byId[workItemId].typeId
);

const groupNameCreator = (overview: UIOverview) => {
  const featureType = featureTypeCreator(overview);

  return (workItemId: number) => featureType(workItemId)
    || overview.byId[workItemId].env
    || 'no-group';
};

const getVelocity = (overview: ProjectOverviewAnalysis['overview']) => {
  const witId = witIdCreator(overview);

  return Object.keys(overview.closed)
    .map(Number)
    .reduce<Record<string, Record<string, number[]>>>(
      (acc, workItemId) => {
        acc[witId(workItemId)] = acc[witId(workItemId)] || {};
        const groupName = groupNameCreator(overview);

        acc[witId(workItemId)][groupName(workItemId)] = (
          acc[witId(workItemId)][groupName(workItemId)] || []
        ).concat(workItemId);

        return acc;
      }, {}
    );
};

const Overview: React.FC = () => {
  const projectAnalysis = useFetchForProject(overview);

  if (projectAnalysis === 'loading') return <Loading />;
  console.log(getVelocity(projectAnalysis.overview), projectAnalysis.overview.types);

  return (
    <>
      <h1>Overview</h1>
    </>
  );
};

export default Overview;
