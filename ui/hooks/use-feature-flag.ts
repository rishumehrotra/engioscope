import useQueryParam, { asBoolean } from './use-query-param.js';

const featureFlags = ['popup'] as const;

export default (flagName: (typeof featureFlags)[number]) => {
  const [isEnabled] = useQueryParam(flagName, asBoolean);
  return isEnabled || false;
};
