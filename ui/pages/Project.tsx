import React from 'react';
import { Switch, Route } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Repos from './Repos';
import ReleasePipelines from './ReleasePipelines';
import WorkItems from './WorkItems';
import SortControls from '../components/SortControls';
import Devs from './Devs';
import ProjectHeader from '../components/ProjectHeader';
import SearchInput from '../components/common/SearchInput';
import AdvancedFilters from '../components/AdvancedFilters';

const Project: React.FC = () => (
  <div>
    <ProjectHeader />
    <div className="mx-32 -mt-24 bg-gray-50 p-4 rounded-t-lg" style={{ marginTop: '-6.5rem' }}>
      <div className="flex justify-between mb-8 rounded-t-lg p-4 -m-4 bg-blue-100 bg-opacity-50">
        <NavBar />
        <div>
          <div className="flex">
            <SearchInput />
            <AdvancedFilters />
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

export default Project;
