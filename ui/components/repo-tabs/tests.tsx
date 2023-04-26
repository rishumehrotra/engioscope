import React from 'react';
import type { RepoAnalysis } from '../../../shared/types.js';
import type { Tab } from './Tabs.js';
import { numberOfTests } from '../../../shared/repo-utils.js';
import BuildPipelineTests from './BuildPipelineTests.jsx';

export default (
  repo: RepoAnalysis,
  queryPeriodDays: number,
  totalTests?: number
): Tab => ({
  title: 'Tests',
  count: totalTests ?? numberOfTests(repo),
  Component: () => (
    <BuildPipelineTests repositoryId={repo.id} queryPeriodDays={queryPeriodDays} />
  ),
});
