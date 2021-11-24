import React, { useEffect } from 'react';
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
import RecordAnalytics from './components/RecordAnalytics';
import Analytics from './pages/Analytics';

const App: React.FC = () => {
  useEffect(() => {
    const observer = new MutationObserver(mutations => {
      if (mutations.every(m => m.addedNodes.length === 0)) return;
      ReactTooltip.rebuild();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, []);

  return (
    <ProjectDetailsProvider>
      <SortContextProvider>
        <div className="mb-32 overflow-y-auto transition duration-500 ease-in-out">
          <ReactTooltip />
          <Router>
            <QueryParamProvider ReactRouterRoute={Route}>
              <RecordAnalytics />
              <Switch>
                <Route path="/analytics">
                  <Analytics />
                </Route>
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
};

export default App;
