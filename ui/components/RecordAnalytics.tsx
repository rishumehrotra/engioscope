import type React from 'react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trpc } from '../helpers/trpc.js';

const RecordAnalytics: React.FC = () => {
  const location = useLocation();

  const { mutate: recordPageView } = trpc.analytics.recordPageView.useMutation({
    retry: 0,
  });

  useEffect(() => {
    recordPageView({ path: location.pathname + location.search });
  }, [location.pathname, location.search, recordPageView]);

  return null;
};

export default RecordAnalytics;
