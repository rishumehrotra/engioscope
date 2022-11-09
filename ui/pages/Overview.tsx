import React from 'react';
import { overview } from '../network.js';
import useFetchForProject from '../hooks/use-fetch-for-project.js';
import Loading from '../components/Loading.js';
import OverviewGraphs from '../components/OverviewGraphs/index.js';
import NewV2 from '../components/OverviewGraphs/NewV2.jsx';
import useQueryParam, { asBoolean } from '../hooks/use-query-param.js';
import { useModalHelper } from '../components/OverviewGraphs/helpers/modal-helpers.jsx';

const Overview: React.FC = () => {
  const projectAnalysis = useFetchForProject(overview);
  const [v2] = useQueryParam<boolean>('v2', asBoolean);
  const [Modal, modalProps, openModal] = useModalHelper();

  return (
    <>
      {v2 ? (
        <>
          <Modal {...modalProps} />
          <NewV2 openModal={openModal} />
        </>
      ) : null}
      {
        projectAnalysis === 'loading'
          ? <Loading />
          : <OverviewGraphs projectAnalysis={projectAnalysis} />
      }
    </>
  );
};

export default Overview;
