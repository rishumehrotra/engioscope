import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { useSetProjectDetails } from '../hooks/project-details-hooks.js';
import CollectionsCodeQualitySummary from '../components/collection-summary/CollectionsCodeQualitySummary.jsx';
import CollectionsBuildsSummary from '../components/collection-summary/CollectionsBuildsSummary.jsx';
import CollectionsReleasesSummary from '../components/collection-summary/CollectionsReleasesSummary.jsx';
import CollectionsTestAutomationSummary from '../components/collection-summary/CollectionsTestAutomationSummary.jsx';
import CollectionWorkItemsSummary from '../components/collection-summary/CollectionWorkItemsSummary.jsx';

const sections = {
  'ci-builds': { label: 'CI Builds', Component: CollectionsBuildsSummary },
  'code-quality': { label: 'Code quality', Component: CollectionsCodeQualitySummary },
  'test-automation': {
    label: 'Test automation',
    Component: CollectionsTestAutomationSummary,
  },
  'releases': { label: 'Releases', Component: CollectionsReleasesSummary },
} as const;

type Section = keyof typeof sections;

const Collections: React.FC = () => {
  const setProjectDetails = useSetProjectDetails();
  const setHeaderDetails = useSetHeaderDetails();
  const { collection } = useParams();

  const [openedMetrics, setOpenedMetrics] = useState<Section[]>([]);

  useEffect(() => {
    setProjectDetails(null);
  }, [setProjectDetails]);

  useEffect(() => {
    setHeaderDetails({ title: collection });
  }, [collection, setHeaderDetails]);

  const handleMetricsToggle = useCallback(
    (metricsName: Section) => () => {
      if (openedMetrics.includes(metricsName)) {
        setOpenedMetrics(openedMetrics.filter(c => c !== metricsName));
      } else {
        setOpenedMetrics([...openedMetrics, metricsName]);
      }
    },
    [openedMetrics]
  );

  if (!collection) {
    return (
      <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
        Sorry no collection name provided
      </div>
    );
  }

  return (
    <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
      <CollectionWorkItemsSummary collectionName={collection} />

      <h2 className="font-bold text-2xl my-2 mt-6">Health metrics</h2>
      {Object.entries(sections).map(([key, { label, Component }]) => {
        const sectionKey = key as Section;
        return (
          <details key={sectionKey} onToggle={handleMetricsToggle(sectionKey)}>
            <summary className="font-semibold text-xl my-2 cursor-pointer">
              {label}
            </summary>
            <Component
              collectionName={collection}
              opened={openedMetrics.includes(sectionKey)}
            />
          </details>
        );
      })}
    </div>
  );
};

export default Collections;
