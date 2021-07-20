import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from 'react-router-dom';
import Project from './pages/project';
import Collection from './pages/collection';
import logo from './logo.png';

const App: React.FC = () => (
  <div className="my-8 mb-32 overflow-y-auto transition duration-500 ease-in-out">
    <div className="container max-w-screen-xl sm:px-4 md:px-8 mx-auto">
      <Router>
        <Link to="/">
          <img src={logo} alt="Logo" className="w-32" />
        </Link>
        <Switch>
          <Route path="/:collection/:project">
            <Project />
          </Route>
          <Route path="/">
            <Collection />
          </Route>
        </Switch>
      </Router>
    </div>
  </div>
);

export default App;
