import React, { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { httpBatchLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { trpc } from './helpers/trpc';

const App: React.FC = () => {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => trpc.createClient({
    links: [
      httpBatchLink({ url: '/api/rpc' })
    ]
  }));

  return (
    <BrowserRouter>
      <RefreshIfUpdated>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ProjectDetailsProvider>
              <SortContextProvider>
                <HeaderProvider>
                  <div className="pb-64 transition duration-500 ease-in-out">
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
          </QueryClientProvider>
        </trpc.Provider>
      </RefreshIfUpdated>
    </BrowserRouter>
  );
};

export default App;
