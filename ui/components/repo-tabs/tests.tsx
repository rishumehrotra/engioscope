import React from 'react';
import type { RepoAnalysis } from '../../../shared/types.js';
import type { Tab } from './Tabs.js';
import BuildPipelineTests from './BuildPipelineTests.jsx';

export default (
  repo: RepoAnalysis,
  queryPeriodDays: number,
  totalTests?: number
): Tab => ({
  title: 'Tests',
  count: totalTests ?? 0,
  Component: () => (
    <BuildPipelineTests repositoryId={repo.id} queryPeriodDays={queryPeriodDays} />
  ),
});
