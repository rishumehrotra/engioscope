import React, { useEffect } from 'react';
import { Routes, Route, useParams, useLocation } from 'react-router-dom';
import NavBar from '../components/common/NavBar.js';
import Repos from './Repos.js';
import ReleasePipelines from './ReleasePipelines.js';
import WorkItems from './WorkItems.js';
import SortControls from '../components/SortControls.js';
import Devs from './Devs.js';
import SearchInput from '../components/common/SearchInput.js';
import AdvancedFilters from '../components/AdvancedFilters.js';
import { useProjectDetails } from '../hooks/project-details-hooks.js';
import usePageName from '../hooks/use-page-name.js';
import Overview from './Overview.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import type { UIProjectAnalysis } from '../../shared/types.js';
import ReleasePipelines2 from './ReleasePipelines2.jsx';

const renderStatIfAvailable = (count: number | undefined, label: string) =>
  count ? (
    <>
      <span className="font-bold text-lg">{count}</span>{' '}
      <span>{label.toLowerCase()}</span>
    </>
  ) : (
    ''
  );

const useNavItems = (projectDetails: UIProjectAnalysis | null) => {
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1];

  const route = (selectedKey: string) =>
    `${pathParts.slice(0, -1).join('/')}/${selectedKey}`;

  return {
    navItems: [
      { key: '', label: 'Overview', linkTo: route('') },
      { key: 'repos', label: 'Repositories', linkTo: route('repos') },
      {
        key: 'release-pipelines',
        label: 'Release Pipelines',
        linkTo: route('release-pipelines'),
      },
      ...(projectDetails?.workItemLabel
        ? [
            {
              key: 'workitems',
              label: projectDetails.workItemLabel[1],
              linkTo: 'workitems',
            },
          ]
        : []),
      { key: 'devs', label: 'Developers', linkTo: 'devs' },
    ],
    selectedTab,
  };
};

const Project: React.FC = () => {
  const projectDetails = useProjectDetails();
  const pageName = usePageName();
  const { project: projectName } = useParams<{ project: string }>();
  const setHeaderDetails = useSetHeaderDetails();

  const project = projectDetails?.name[1] === projectName ? projectDetails : null;

  const { navItems, selectedTab } = useNavItems(projectDetails);

  useEffect(() => {
    projectDetails &&
      setHeaderDetails({
        title: projectName || '',
        subtitle: (
          <div className="text-base mt-2 font-normal text-gray-200">
            {project ? (
              <>
                {renderStatIfAvailable(
                  project.reposCount,
                  pageName('repos', project.reposCount)
                )}
                {project.releasePipelineCount ? ' | ' : ''}
                {renderStatIfAvailable(
                  project.releasePipelineCount,
                  pageName('release-pipelines', project.releasePipelineCount)
                )}
                {project.workItemCount ? ' | ' : ''}
                {renderStatIfAvailable(
                  project.workItemCount,
                  pageName('workitems', project.workItemCount)
                )}
              </>
            ) : (
              <span className="font-bold text-lg">&nbsp;</span>
            )}
          </div>
        ),
        lastUpdated: projectDetails.lastUpdated,
      });
  }, [pageName, project, projectDetails, projectName, setHeaderDetails]);

  return (
    <div className="mx-32 bg-gray-50 rounded-t-lg" style={{ marginTop: '-2.25rem' }}>
      <NavBar
        navItems={navItems}
        selectedTab={selectedTab}
        right={
          <div className="flex">
            <div className="flex mr-4">
              <SearchInput />
              <AdvancedFilters />
            </div>
            <SortControls />
          </div>
        }
      />

      <Routes>
        <Route path="repos" element={<Repos />} />
        <Route path="release-pipelines" element={<ReleasePipelines />} />
        <Route path="release-pipelines2" element={<ReleasePipelines2 />} />
        <Route path="devs" element={<Devs />} />
        <Route path="workitems" element={<WorkItems />} />
        <Route path="" element={<Overview />} />
      </Routes>
    </div>
  );
};

export default Project;
