import useQueryParam, { asBoolean } from './use-query-param.js';

const featureFlags = [] as const;

export default (flagName: (typeof featureFlags)[number]) => {
  const [isEnabled] = useQueryParam(flagName, asBoolean);
  return isEnabled || false;
};
