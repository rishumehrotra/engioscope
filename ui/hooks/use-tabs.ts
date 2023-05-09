import { useLocation } from 'react-router-dom';
import { last } from 'rambda';
import type { Tab } from '../types.js';

export const useTabs = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const selectedTab = last(pathParts) as Tab;

  return [selectedTab] as const;
};
