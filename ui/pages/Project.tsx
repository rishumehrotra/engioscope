import React from 'react';
import { Switch, Route, useParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Repos from './Repos';
import ReleasePipelines from './ReleasePipelines';
import WorkItems from './WorkItems';
import SortControls from '../components/SortControls';
import Devs from './Devs';
import SearchInput from '../components/common/SearchInput';
import AdvancedFilters from '../components/AdvancedFilters';
import Header from '../components/Header';
import { useProjectDetails } from '../hooks/project-details-hooks';
import usePageName from '../hooks/use-page-name';

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

  const project = projectDetails?.name[1] === projectName ? projectDetails : null;

  return (
    <div>
      <Header
        lastUpdated={project ? project.lastUpdated : '...'}
        title={projectName || ' '}
        subtitle={() => (
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
        )}
      />
      <div className="mx-32 bg-gray-50 rounded-t-lg" style={{ marginTop: '-2.25rem' }}>
        <div className="flex justify-between mb-8 rounded-lg p-4 bg-white shadow">
          <NavBar />
          <div>
            <div className="flex">
              <div className="flex mr-4">
                <SearchInput />
                <AdvancedFilters />
              </div>
              <SortControls />
            </div>
          </div>
        </div>

        <Switch>
          <Route path="/:collection/:project/repos">
            <Repos />
          </Route>
          <Route path="/:collection/:project/release-pipelines">
            <ReleasePipelines />
          </Route>
          <Route path="/:collection/:project/devs">
            <Devs />
          </Route>
          <Route path="/:collection/:project/workitems">
            <WorkItems />
          </Route>
        </Switch>
      </div>
    </div>
  );
};

export default Project;
