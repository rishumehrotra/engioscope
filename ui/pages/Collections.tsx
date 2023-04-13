import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { useSetProjectDetails } from '../hooks/project-details-hooks.js';

import CollectionSummaryTable from '../components/CollectionSummaryTable.jsx';
import Loading from '../components/Loading.jsx';

const Collections: React.FC = () => {
  const setProjectDetails = useSetProjectDetails();
  const setHeaderDetails = useSetHeaderDetails();
  const { collection } = useParams();

  useEffect(() => {
    setProjectDetails(null);
  }, [setProjectDetails]);

  useEffect(() => {
    setHeaderDetails({ title: collection });
  }, [collection, setHeaderDetails]);

  return (
    <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
      {collection ? <CollectionSummaryTable collectionName={collection} /> : <Loading />}
    </div>
  );
};

export default Collections;
