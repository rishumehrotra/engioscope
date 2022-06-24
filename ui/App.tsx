import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import Project from './pages/Project';
import Collection from './pages/Collection';
import { ProjectDetailsProvider } from './hooks/project-details-hooks';
import { SortContextProvider } from './hooks/sort-hooks';
import RecordAnalytics from './components/RecordAnalytics';
import Analytics from './pages/Analytics';
import Summary from './pages/Summary';
import ChangeProgram from './pages/ChangeProgram';
import Header from './components/Header';
import { HeaderProvider } from './hooks/header-hooks';
import RefreshIfUpdated from './components/RefreshIfUpdated';
import ByTrack from './pages/ByTrack';

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
                  <Route path="/by-track" element={<ByTrack />} />
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
