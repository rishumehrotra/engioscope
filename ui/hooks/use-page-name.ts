import type { Tab } from '../types';
import { useProjectDetails } from './project-details-hooks';

export default () => {
  const projectDetails = useProjectDetails();

  return (pageType: Tab, count: number) => {
    if (pageType === 'repos') return count === 1 ? 'Repository' : 'Repositories';
    if (pageType === 'release-pipelines') return count === 1 ? 'Release pipeline' : 'Release pipelines';
    if (!projectDetails) return '';
    return count === 1 ? projectDetails?.workItemLabel[0] : projectDetails?.workItemLabel[1];
  };
};
