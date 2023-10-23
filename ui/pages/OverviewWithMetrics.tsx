import React from 'react';

import QueryPeriodSelector from '../components/QueryPeriodSelector.jsx';
import ValueMetrics from '../components/OverviewWithMetrics/ValueMetrics.jsx';
import HealthMetrics from '../components/OverviewWithMetrics/HealthMetrics.jsx';

const OverviewWithMetrics = () => {
  return (
    <div>
      <div className="text-left mb-6">
        <QueryPeriodSelector />
      </div>
      <ValueMetrics />
      <HealthMetrics />
    </div>
  );
};

export default OverviewWithMetrics;
