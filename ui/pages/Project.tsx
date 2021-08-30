import React from 'react';
import { Switch, Route } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Repos from './Repos';
import ReleasePipelines from './ReleasePipelines';
import WorkItems from './WorkItems';
import SortControls from '../components/SortControls';
import Devs from './Devs';
import ProjectHeader from '../components/ProjectHeader';

const Project: React.FC = () => (
  <div>
    <ProjectHeader />
    <div className="px-32">
      <div className="grid grid-cols-3 mb-8">
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
  </div>
);

export default Project;
