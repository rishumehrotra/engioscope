import React from 'react';
import { Switch, Route } from 'react-router-dom';
import SearchInput from '../components/common/SearchInput';
import NavBar from '../components/NavBar';
import Repos from './Repos';
import ReleasePipelines from './ReleasePipelines';
import AdvancedFilters from '../components/AdvancedFilters';
import WorkItems from './WorkItems';
import SortControls from '../components/SortControls';
import { ProjectDetails } from '../components/ProjectDetails';
import Devs from './Devs';

const Project: React.FC = () => (
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
      <SortControls />
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
);

export default Project;
