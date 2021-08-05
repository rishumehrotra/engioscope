import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';
import Project from './pages/Project';
import Collection from './pages/Collection';
import logo from './images/engioscope-serif.png';

const App: React.FC = () => (
  <div className="my-8 mb-32 overflow-y-auto transition duration-500 ease-in-out">
    <div className="container max-w-screen-xl sm:px-4 md:px-8 mx-auto">
      <Router>
        <QueryParamProvider ReactRouterRoute={Route}>
          <Link to="/">
            <img src={logo} alt="Logo" className="w-36" />
          </Link>
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
  </div>
);

export default App;
