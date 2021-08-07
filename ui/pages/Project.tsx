import React from 'react';
import { useLocation, Switch, Route } from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import NavBar from '../components/NavBar';
import Repos from './Repos';
import ReleasePipelines from './ReleasePipelines';
import AdvancedFilters from '../components/AdvancedFilters';
import { Tab, reposSortByParams, workItemsSortByParams } from '../types';
import WorkItems from './WorkItems';
import SortControls from '../components/SortControls';
import { ProjectDetails } from '../components/ProjectDetails';

const Project: React.FC = () => {
  const location = useLocation();

  const pathParts = location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1] as Tab;

  return (
    <div>
      <div className="grid grid-cols-3 justify-between w-full items-start my-12">
        <ProjectDetails />
        <div className="flex justify-end">
          <SearchInput />
          <AdvancedFilters />
        </div>
      </div>
      <div className="pb-6">
        <div className="border-t border-gray-200" />
      </div>
      <div className="grid grid-cols-2 mb-8">
        <NavBar />
        {selectedTab === 'repos' ? <SortControls options={reposSortByParams} defaultSortBy="Builds" /> : null }
        {selectedTab === 'workitems' ? <SortControls options={workItemsSortByParams} defaultSortBy="Bundle size" /> : null }
      </div>

      <Switch>
        <Route path="/:collection/:project/repos">
          <Repos />
        </Route>
        <Route path="/:collection/:project/release-pipelines">
          <ReleasePipelines />
        </Route>
        <Route path="/:collection/:project/workitems">
          <WorkItems />
        </Route>
      </Switch>
    </div>
  );
};

export default Project;
