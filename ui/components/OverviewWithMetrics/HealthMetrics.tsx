import React from 'react';
import TeamsSelector from '../teams-selector/TeamsSelector.js';
import ReleasePipelinesHealthMetrics from './ReleasePipelinesHealthMetrics.jsx';
import ReposHealthMetrics from './ReposHealthMetrics.jsx';

const HealthMetrics = () => {
  return (
    <div>
      <div className="text-2xl font-medium pt-6">Health Metrics</div>
      <TeamsSelector />
      <ReposHealthMetrics />
      <ReleasePipelinesHealthMetrics />
    </div>
  );
};

export default HealthMetrics;
