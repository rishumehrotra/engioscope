import { useLocation } from 'react-router-dom';
import type { Tab } from '../types';

export const useTabs = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const selectedTab = pathParts[pathParts.length - 1] as Tab;

  return [selectedTab] as const;
};
