import { useHistory } from 'react-router-dom';
import { parseQueryString, updateQueryString } from '../helpers';

type UseUrlParamsProps = [string | number | boolean, () => void]

const useUrlParams = <T extends string | number | boolean>(initialValue: T, paramName: string) => {
  const history = useHistory();
  const paramValueFromHistory = parseQueryString(history.location.search)[paramName];
  let paramValue;
  switch (typeof initialValue) {
    case 'number':
      paramValue = Number(paramValueFromHistory);
      break;
    case 'string':
      paramValue = String(paramValueFromHistory);
      break;
    default:
      paramValue = paramValueFromHistory === 'true';
      break;
  }
  if (paramValueFromHistory === undefined) paramValue = paramValueFromHistory;

  const setParamValue = (paramValue: T) => history.replace({ search: updateQueryString(paramName, String(paramValue)) });
  return [paramValue || initialValue, setParamValue] as UseUrlParamsProps;
};

export default useUrlParams;
