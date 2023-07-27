import React, { useEffect, useState } from 'react';
import type { TrackFeatures, TrackFlowMetrics } from '../../shared/types.js';
import NavBar from '../components/common/NavBar.jsx';
import Loading from '../components/Loading.jsx';
import { shortDate } from '../helpers/utils.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { fetchTrackFeatures, fetchTrackFlowMetrics } from '../network.js';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import FlowMetrics from '../components/tracks-page/FlowMetrics.jsx';
import FeaturesList from '../components/tracks-page/FeaturesList.jsx';
import { useQueryPeriodDays } from '../hooks/query-hooks.js';

const navItems = [
  { key: 'metrics', label: 'Flow metrics', linkTo: '/tracks' },
  { key: 'features', label: 'Features', linkTo: '/tracks?show=listing' },
];

const TrackNavBar: React.FC = () => {
  const [show] = useQueryParam('show', asString);

  return (
    <NavBar
      navItems={navItems}
      selectedTab={show === 'listing' ? navItems[1].key : navItems[0].key}
      right={null}
    />
  );
};

const fromDate = (refDate: string, daysAgo: number) => {
  const d = new Date(refDate);
  d.setDate(d.getDate() - daysAgo);
  return d;
};

const Tracks: React.FC = () => {
  const queryPeriodDays = useQueryPeriodDays();
  const [trackFlowMetrics, setTrackFlowMetrics] = useState<TrackFlowMetrics | null>(null);
  const [trackFeatures, setTrackFeatures] = useState<TrackFeatures | null>(null);
  const [show] = useQueryParam('show', asString);

  useEffect(() => {
    if (show !== 'listing') {
      // TODO: Error handling
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchTrackFlowMetrics().then(setTrackFlowMetrics);
    }
  }, [show]);
  useEffect(() => {
    if (show === 'listing') {
      // TODO: Error handling
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchTrackFeatures().then(setTrackFeatures);
    }
  }, [show]);
  const setHeaderDetails = useSetHeaderDetails();

  useEffect(() => {
    const headerInfo = trackFlowMetrics || trackFeatures;

    setHeaderDetails({
      title: 'Tracks',
      subtitle: headerInfo ? (
        <div className="text-base mt-2 font-normal text-gray-200">
          <span className="text-lg font-bold">
            {shortDate(fromDate(headerInfo.lastUpdated, queryPeriodDays))}
          </span>
          {' to '}
          <span className="text-lg font-bold">
            {shortDate(new Date(headerInfo.lastUpdated))}
          </span>
        </div>
      ) : null,
      lastUpdated: headerInfo?.lastUpdated,
    });
  }, [trackFlowMetrics, setHeaderDetails, trackFeatures, queryPeriodDays]);

  const loadedData = trackFlowMetrics || trackFeatures;

  return (
    <>
      <div className="mx-32 bg-gray-50 rounded-t-lg" style={{ marginTop: '-2.25rem' }}>
        <TrackNavBar />
      </div>
      <div className="mx-32">
        {loadedData ? (
          <div className="mt-8 bg-gray-50">
            {Object.keys(loadedData.tracks).length
              ? show === 'listing'
                ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  trackFeatures && <FeaturesList tracks={trackFeatures!.tracks} />
                : trackFlowMetrics && <FlowMetrics tracks={trackFlowMetrics} />
              : 'Tracks not configured'}
          </div>
        ) : (
          <Loading />
        )}
      </div>
    </>
  );
};

export default Tracks;
