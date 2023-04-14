import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { useSetProjectDetails } from '../hooks/project-details-hooks.js';

import CollectionsCodeQualitySummary from '../components/CollectionsCodeQualitySummary.jsx';
import CollectionsBuildsSummary from '../components/CollectionsBuildsSummary.jsx';
import CollectionsReleasesSummary from '../components/CollectionsReleasesSummary.jsx';
import CollectionsTestAutomationSummary from '../components/CollectionsTestAutomationSummary.jsx';

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

  if (!collection) {
    return (
      <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
        Sorry no collection name provided
      </div>
    );
  }

  return (
    <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
      <h2 className="text-2xl font-bold mt-8">Health metrics</h2>
      <details>
        <summary className="font-semibold text-xl my-2 cursor-pointer">
          Test automation
        </summary>
        <CollectionsTestAutomationSummary collectionName={collection} />
      </details>
      <details>
        <summary className="font-semibold text-xl my-2 cursor-pointer">
          Code quality
        </summary>
        <CollectionsCodeQualitySummary collectionName={collection} />
      </details>
      <details>
        <summary className="font-semibold text-xl my-2 cursor-pointer">CI Builds</summary>
        <CollectionsBuildsSummary collectionName={collection} />
      </details>
      <details>
        <summary className="font-semibold text-xl my-2 cursor-pointer">Releases</summary>
        <CollectionsReleasesSummary collectionName={collection} />
      </details>
    </div>
  );
};

export default Collections;
