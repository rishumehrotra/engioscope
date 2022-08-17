import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import Project from './pages/Project.js';
import Collection from './pages/Collection.js';
import { ProjectDetailsProvider } from './hooks/project-details-hooks.js';
import { SortContextProvider } from './hooks/sort-hooks.js';
import RecordAnalytics from './components/RecordAnalytics.js';
import Analytics from './pages/Analytics.js';
import Summary from './pages/Summary.js';
import ChangeProgram from './pages/ChangeProgram.js';
import Header from './components/Header.js';
import { HeaderProvider } from './hooks/header-hooks.js';
import RefreshIfUpdated from './components/RefreshIfUpdated.js';
import Tracks from './pages/Tracks.jsx';

const App: React.FC = () => {
  useEffect(() => {
    const observer = new MutationObserver(mutations => {
      if (mutations.every(m => m.addedNodes.length === 0)) return;
      ReactTooltip.rebuild();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, []);

  return (
    <BrowserRouter>
      <RefreshIfUpdated>
        <ProjectDetailsProvider>
          <SortContextProvider>
            <HeaderProvider>
              <div className="pb-64 transition duration-500 ease-in-out">
                <ReactTooltip />
                <RecordAnalytics />
                <Header />
                <Routes>
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/summary" element={<Summary />} />
                  <Route path="/change-program" element={<ChangeProgram />} />
                  <Route path="/tracks" element={<Tracks />} />
                  <Route path="/:collection/:project/*" element={<Project />} />
                  <Route path="/" element={<Collection />} />
                </Routes>
              </div>
            </HeaderProvider>
          </SortContextProvider>
        </ProjectDetailsProvider>
      </RefreshIfUpdated>
    </BrowserRouter>
  );
};

export default App;
