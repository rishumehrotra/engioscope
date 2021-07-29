import React from 'react';
import { RepoAnalysis } from '../../../shared/types';
import { num } from '../../helpers';
import { Tab } from './Tabs';
import Metric from '../Metric';
import TabContents from './TabContents';

export default (prs: RepoAnalysis['prs']): Tab => ({
  title: 'Pull requests',
  count: prs.total,
  content: (
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

