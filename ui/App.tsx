import React, { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { httpLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import superjson from 'superjson';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Project from './pages/Project.js';
import HomePage from './pages/HomePage.js';
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
import { oneMinuteInMs } from '../shared/utils.js';
import { DateRangeProvider } from './hooks/date-range-hooks.js';
import Status from './pages/Status.jsx';
import Collections from './pages/Collections.jsx';

const App: React.FC = () => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnMount: false,
            refetchOnReconnect: false,
            refetchInterval: false,
            refetchOnWindowFocus: false,
            staleTime: 15 * oneMinuteInMs,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpLink({ url: '/api/rpc' })],
      transformer: superjson,
    })
  );

  return (
    <BrowserRouter>
      <RefreshIfUpdated>
        <DateRangeProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <ProjectDetailsProvider>
                <SortContextProvider>
                  <HeaderProvider>
                    <DndProvider backend={HTML5Backend}>
                      <div className="pb-64 transition duration-500 ease-in-out">
                        <RecordAnalytics />
                        <Header />
                        <Routes>
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/summary" element={<Summary />} />
                          <Route path="/change-program" element={<ChangeProgram />} />
                          <Route path="/tracks" element={<Tracks />} />
                          <Route path="/status" element={<Status />} />
                          <Route path="/:collection" element={<Collections />} />
                          <Route path="/:collection/:project/*" element={<Project />} />
                          <Route path="/" element={<HomePage />} />
                        </Routes>
                      </div>
                    </DndProvider>
                  </HeaderProvider>
                </SortContextProvider>
              </ProjectDetailsProvider>
              <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
          </trpc.Provider>
        </DateRangeProvider>
      </RefreshIfUpdated>
    </BrowserRouter>
  );
};

export default App;
