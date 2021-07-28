import { useHistory } from 'react-router-dom';
import { parseQueryString, updateQueryString } from '../helpers';

type SupportedTypesInUrl = 'string' | 'number' | 'boolean';

const value = (typeofParam: SupportedTypesInUrl, paramValueFromUrl?: string) => {
  if (paramValueFromUrl === undefined) return undefined;
  switch (typeofParam) {
    case 'number': return Number(paramValueFromUrl);
    case 'string': return String(paramValueFromUrl);
    default: return paramValueFromUrl === 'true';
  }
};

const createUrlParamsHook = <U extends Record<string, SupportedTypesInUrl>>(paramTypeDefinition: U) => (
  <T extends string | number | boolean>(paramName: keyof typeof paramTypeDefinition) => {
    const history = useHistory();
    const paramValueFromUrl = parseQueryString(history.location.search)[paramName as string];
    const paramValue = value(paramTypeDefinition[paramName], paramValueFromUrl);
    const setParamValue = (paramValue: T | undefined) => (
      history.replace({ search: updateQueryString(paramName as string, String(paramValue)) })
    );
    return [paramValue, setParamValue] as [T | undefined, (x: T | undefined) => void];
  }
);

export default createUrlParamsHook;
