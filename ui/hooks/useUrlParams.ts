import { useHistory } from 'react-router-dom';
import { parseQueryString, updateQueryString } from '../helpers';

const value = <T>(initialValue: T, paramValueFromUrl?: string) => {
  if (paramValueFromUrl === undefined) return undefined;

  switch (typeof initialValue) {
    case 'number': return Number(paramValueFromUrl);
    case 'string': return String(paramValueFromUrl);
    default: return paramValueFromUrl === 'true';
  }
};

const useUrlParams = <T extends string | number | boolean>(paramName: string, initialValue?: T) => {
  const history = useHistory();
  const paramValueFromUrl = parseQueryString(history.location.search)[paramName];

  const paramValue = value(initialValue, paramValueFromUrl);

  const setParamValue = (paramValue: T) => history.replace({ search: updateQueryString(paramName, String(paramValue)) });
  return [paramValue || initialValue, setParamValue] as [T, (x: T) => void];
};

export default useUrlParams;
