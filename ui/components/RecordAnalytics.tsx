import type React from 'react';
import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RecordAnalytics: React.FC = () => {
  const location = useLocation();

  const sendPageView = useCallback(() => {
    try {
      const data = {
        event: 'pageload',
        pathname: location.pathname,
        search: location.search
      };

      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon('/api/log', blob);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending beacon', error);
    }
  }, [location.pathname, location.search]);

  useEffect(sendPageView, [sendPageView]);
  return null;
};

export default RecordAnalytics;
