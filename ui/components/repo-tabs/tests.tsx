import React from 'react';
import type { RepoAnalysis } from '../../../shared/types.js';
import type { Tab } from './Tabs.js';
import { numberOfTests } from '../../../shared/repo-utils.js';
import BuildPipelineTests from './BuildPipelineTests.jsx';

export default (repo: RepoAnalysis, queryPeriodDays: number): Tab => ({
  title: 'Tests',
  count: numberOfTests(repo),
  Component: () => (
    <BuildPipelineTests repositoryId={repo.id} queryPeriodDays={queryPeriodDays} />
  ),
});
