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
import ReleasePipelines2 from './ReleasePipelines2.jsx';
import { useCollectionAndProject } from '../hooks/query-hooks.js';
import { trpc } from '../helpers/trpc.js';
import BuildTimelines from './BuildTimelines.jsx';

const renderStatIfAvailable = (count: number | undefined, label: string) =>
  count ? (
    <>
      <span className="font-bold text-lg">{count}</span>{' '}
      <span>{label.toLowerCase()}</span>
    </>
  ) : (
    ''
  );

const useNavItems = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1];

  const cnp = useCollectionAndProject();
  const projectSummary = trpc.projects.summary.useQuery(cnp);

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
      ...(projectSummary.data?.workItemLabel
        ? [
            {
              key: 'workitems',
              label: projectSummary.data.workItemLabel,
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
  const cnp = useCollectionAndProject();
  const { data: projectSummary } = trpc.projects.summary.useQuery(cnp);
  const pageName = usePageName();
  const { project: projectName } = useParams<{ project: string }>();
  const setHeaderDetails = useSetHeaderDetails();

  const { navItems, selectedTab } = useNavItems();

  useEffect(() => {
    projectSummary &&
      setHeaderDetails({
        title: cnp.project || '',
        subtitle: (
          <div className="text-base mt-2 font-normal text-gray-200">
            {projectSummary ? (
              <>
                {renderStatIfAvailable(
                  projectSummary.repos,
                  pageName('repos', projectSummary.repos)
                )}
                {projectSummary.releasePipelines ? ' | ' : ''}
                {renderStatIfAvailable(
                  projectSummary.releasePipelines,
                  pageName('release-pipelines', projectSummary.releasePipelines)
                )}
                {/* {projectSummary.workItemCount ? ' | ' : ''}
                {renderStatIfAvailable(
                  projectSummary.workItemCount,
                  pageName('workitems', projectSummary.workItemCount)
                )} */}
              </>
            ) : (
              <span className="font-bold text-lg">&nbsp;</span>
            )}
          </div>
        ),
        lastUpdated: projectDetails?.lastUpdated,
      });
  }, [
    pageName,
    projectSummary,
    projectDetails,
    projectName,
    setHeaderDetails,
    cnp.project,
  ]);

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
        <Route path="release-pipelines" element={<ReleasePipelines2 />} />
        <Route path="release-pipelines2" element={<ReleasePipelines />} />
        <Route path="devs" element={<Devs />} />
        <Route path="build-timelines" element={<BuildTimelines />} />
        <Route path="workitems" element={<WorkItems />} />
        <Route path="" element={<Overview />} />
      </Routes>
    </div>
  );
};

export default Project;
