import React from 'react';
import type { RepoAnalysis } from '../../../shared/types.js';
import { num } from '../../helpers/utils.js';
import type { Tab } from './Tabs.js';
import Metric from '../Metric.js';
import TabContents from './TabContents.js';

export default (prs: RepoAnalysis['prs']): Tab => ({
  title: 'Pull requests',
  count: prs.total,
  Component: () => (
    <TabContents gridCols={4}>
      <Metric name="Active" value={num(prs.active)} position="first" />
      <Metric name="Abandoned" value={num(prs.abandoned)} />
      <Metric name="Completed" value={num(prs.completed)} />
      {prs.timeToApprove ? (
        <Metric
          name="Time to approve"
          value={prs.timeToApprove.average}
          additionalValue={`${prs.timeToApprove.min} - ${prs.timeToApprove.max}`}
          position="last"
        />
      ) : (
        <Metric
          name="Time to approve"
          value="-"
          position="last"
        />
      )}
    </TabContents>
  )
});

