import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Tracks as TTracks } from '../../shared/types.js';
import NavBar from '../components/common/NavBar.jsx';
import Loading from '../components/Loading.jsx';
import { shortDate } from '../helpers/utils.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { fetchTracks } from '../network.js';
import { WorkItemsList } from '../components/tracks-page/WorkItemsList';

const navItems = [
  { key: 'metrics', label: 'Flow metrics', linkTo: '/tracks' },
  { key: 'features', label: 'Features', linkTo: '/tracks?show=listing' }
];

const TrackNavBar: React.FC = () => {
  const location = useLocation();

  return (
    <NavBar
      navItems={navItems}
      selectedTab={navItems.find(n => n.linkTo.startsWith(location.pathname))?.key || navItems[0].key}
      right={null}
    />
  );
};

const threeMonthsAgo = (date: string) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 3);
  return d;
};

const Tracks: React.FC = () => {
  const [tracks, setTracks] = useState<TTracks | null>(null);

  useEffect(() => { fetchTracks().then(setTracks); }, []);
  const setHeaderDetails = useSetHeaderDetails();

  useEffect(() => {
    setHeaderDetails({
      globalSettings: tracks,
      title: 'Tracks',
      subtitle: tracks
        ? (
          <div className="text-base mt-2 font-normal text-gray-200">
            <span className="text-lg font-bold">{shortDate(threeMonthsAgo(tracks.lastUpdated))}</span>
            {' to '}
            <span className="text-lg font-bold">{shortDate(new Date(tracks.lastUpdated))}</span>
          </div>
        )
        : null
    });
  }, [tracks, setHeaderDetails]);

  return (
    <>
      <div className="mx-32 bg-gray-50 rounded-t-lg" style={{ marginTop: '-2.25rem' }}>
        <TrackNavBar />
      </div>
      <div className="mx-32">
        {!tracks
          ? <Loading />
          : (
            <div className="mt-8 bg-gray-50">
              {!tracks.workItems.length
                ? 'Tracks not configured'
                : <WorkItemsList tracks={tracks} />}
            </div>
          )}
      </div>
    </>
  );
};

export default Tracks;
