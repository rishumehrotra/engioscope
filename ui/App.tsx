import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route
} from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';
import ReactTooltip from 'react-tooltip';
import Project from './pages/Project';
import Collection from './pages/Collection';
import { ProjectDetailsProvider } from './hooks/project-details-hooks';
import { SortContextProvider } from './hooks/sort-hooks';
import Analytics from './components/Analytics';

const App: React.FC = () => (
  <ProjectDetailsProvider>
    <SortContextProvider>
      <div className="mb-32 overflow-y-auto transition duration-500 ease-in-out">
        <Router>
          <QueryParamProvider ReactRouterRoute={Route}>
            <Analytics />
            <ReactTooltip />
            <Switch>
              <Route path="/:collection/:project">
                <Project />
              </Route>
              <Route path="/">
                <Collection />
              </Route>
            </Switch>
          </QueryParamProvider>
        </Router>
      </div>
    </SortContextProvider>
  </ProjectDetailsProvider>
);

export default App;
