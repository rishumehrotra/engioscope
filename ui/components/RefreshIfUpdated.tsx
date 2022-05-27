import React, { useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

const hasVersionChanged = () => fetch('/api/ui-version')
  .then(res => res.text())
  // eslint-disable-next-line no-undef
  .then(version => version !== APP_VERSION);

const RefreshIfUpdated: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const refreshPageRef = useRef(false);
  const timer = useRef<number>();

  useEffect(() => {
    if (refreshPageRef.current) window.location.reload();
  }, [location.pathname]);

  useEffect(() => {
    timer.current = window.setInterval(() => {
      hasVersionChanged()
        .then(versionHasChanged => {
          if (versionHasChanged) {
            refreshPageRef.current = true;
            window.clearInterval(timer.current);
          }
        })
        .catch(() => {
          // do nothing
        });
    }, 1000 * 60 * 15);

    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  return (<>{children}</>);
};

export default RefreshIfUpdated;
