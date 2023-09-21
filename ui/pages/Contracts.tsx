import React from 'react';
import { Stat, SummaryCard } from '../components/SummaryCard.jsx';
import { num } from '../helpers/utils.js';

export default () => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <SummaryCard className="mb-4">
          <Stat title="Contracs used by both providers and consumers" value={num(123)} />
        </SummaryCard>
        <SummaryCard>
          <Stat title="API coverage" value="100%" />
          <Stat title="Number of specs used as stub" value={num(123)} />
        </SummaryCard>
      </div>
      <div className="col-span-2">Service dependencies</div>
    </div>
  );
};
