import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { Tooltip } from 'react-tooltip';
import { z } from 'zod';
import useLocalStorage from '../../hooks/use-local-storage.js';

type FeatureAlertProps = {
  dismiss: () => void;
  show: boolean;
  heading: ReactNode;
  body: ReactNode;
  ctaLabel?: ReactNode;
};

export const FeatureAlert = ({
  show,
  dismiss,
  heading,
  body,
  ctaLabel = 'Got it',
}: FeatureAlertProps) => {
  if (!show) return null;

  return (
    <Tooltip
      id="feature-alert"
      isOpen
      clickable
      style={{
        background: '#fff',
        opacity: 1,
        boxShadow:
          'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 25px 50px -12px rgb(0 0 0 / 0.25)',
        padding: 0,
      }}
      place="bottom-start"
    >
      <div className="bg-theme-page-content text-theme-base p-4 w-96">
        <h3 className="text-theme-base text-xl font-medium">{heading}</h3>
        <div className="text-theme-helptext py-3 text-base">{body}</div>
        <button
          className="primary-button inline-block w-full font-medium"
          onClick={dismiss}
        >
          {ctaLabel}
        </button>
      </div>
    </Tooltip>
  );
};

export const useFeatureAlert = (key: string) => {
  const [shownFeatureAlerts, setShownFeatureAlerts] = useLocalStorage(
    'shown-feature-alerts',
    z.array(z.string()).default([])
  );
  const [showFeatureAlert, setShowFeatureAlert] = useState(
    !shownFeatureAlerts?.includes(key)
  );

  const setFeatureAlertSeen = useCallback(() => {
    setShowFeatureAlert(false);
    setShownFeatureAlerts([...(shownFeatureAlerts || []), key]);
  }, [key, setShownFeatureAlerts, shownFeatureAlerts]);

  const anchorProps = useMemo(
    () => (showFeatureAlert ? { 'data-tooltip-id': 'feature-alert' } : {}),
    [showFeatureAlert]
  );
  const featureAlertProps = useMemo(
    () => ({ show: showFeatureAlert, dismiss: setFeatureAlertSeen }),
    [setFeatureAlertSeen, showFeatureAlert]
  );

  return {
    featureAlertProps,
    anchorProps,
  };
};
