import React from 'react';
import type { Tab } from './Tabs.jsx';
import BuildPipelineTests from './BuildPipelineTests.jsx';

export default (repositoryId: string, totalTests?: number): Tab => ({
  title: 'Tests',
  count: totalTests ?? 0,
  Component: () => <BuildPipelineTests repositoryId={repositoryId} />,
});
