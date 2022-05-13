import { useCallback } from 'react';
import type { Tab } from '../types';
import { useProjectDetails } from './project-details-hooks';

export default () => {
  const projectDetails = useProjectDetails();

  return useCallback((pageType: Tab, count: number) => {
    if (pageType === 'repos') return count === 1 ? 'Repository' : 'Repositories';
    if (pageType === 'release-pipelines') return count === 1 ? 'Release pipeline' : 'Release pipelines';
    if (pageType === 'devs') return count === 1 ? 'Developer' : 'Developers';
    if (!projectDetails) return '';
    return count === 1 ? projectDetails?.workItemLabel[0] : projectDetails?.workItemLabel[1];
  }, [projectDetails]);
};
