import React, { useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Repos from './Repos';
import ReleasePipelines from './ReleasePipelines';
import WorkItems from './WorkItems';
import SortControls from '../components/SortControls';
import Devs from './Devs';
import SearchInput from '../components/common/SearchInput';
import AdvancedFilters from '../components/AdvancedFilters';
import { useProjectDetails } from '../hooks/project-details-hooks';
import usePageName from '../hooks/use-page-name';
import Overview from './Overview';
import { useSetHeaderDetails } from '../hooks/header-hooks';

const renderStatIfAvailable = (count: number | undefined, label: string) => (count ? (
  <>
    <span className="font-bold text-lg">{count}</span>
    {' '}
    <span>{label}</span>
  </>
) : '');

const Project: React.FC = () => {
  const projectDetails = useProjectDetails();
  const pageName = usePageName();
  const { project: projectName } = useParams<{ project: string }>();
  const setHeaderDetails = useSetHeaderDetails();

  const project = projectDetails?.name[1] === projectName ? projectDetails : null;

  useEffect(() => {
    projectDetails && setHeaderDetails({
      globalSettings: projectDetails,
      title: projectName || '',
      subtitle: (
        <div className="text-base mt-2 font-normal text-gray-200">
          {project ? (
            <>
              {renderStatIfAvailable(project.reposCount, pageName('repos', project.reposCount))}
              {project.releasePipelineCount ? ' | ' : ''}
              {renderStatIfAvailable(project.releasePipelineCount, pageName('release-pipelines', project.releasePipelineCount))}
              {project.workItemCount ? ' | ' : ''}
              {renderStatIfAvailable(project.workItemCount, pageName('workitems', project.workItemCount))}
            </>
          ) : <span className="font-bold text-lg">&nbsp;</span>}
        </div>
      )
    });
  }, [pageName, project, projectDetails, projectName, setHeaderDetails]);

  return (
    <div className="mx-32 bg-gray-50 rounded-t-lg" style={{ marginTop: '-2.25rem' }}>
      <div className="flex justify-between mb-8 rounded-lg p-4 bg-white shadow">
        <NavBar />
        <div className="flex">
          <div className="flex mr-4">
            <SearchInput />
            <AdvancedFilters />
          </div>
          <SortControls />
        </div>
      </div>

      <Routes>
        <Route path="repos" element={<Repos />} />
        <Route path="release-pipelines" element={<ReleasePipelines />} />
        <Route path="devs" element={<Devs />} />
        <Route path="workitems" element={<WorkItems />} />
        <Route path="" element={<Overview />} />
      </Routes>
    </div>
  );
};

export default Project;
