import { useState } from 'react';
import useUIConfig from './use-ui-config.js';

export default () => {
  const { queryPeriodDays } = useUIConfig();
  return useState(() => queryPeriodDays);
};
