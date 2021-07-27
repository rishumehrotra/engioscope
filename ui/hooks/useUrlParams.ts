import { useHistory } from 'react-router-dom';
import { parseQueryString, updateQueryString } from '../helpers';

type UseUrlParamsProps = [string | number | boolean, () => void]

const useUrlParams = <T extends string | number | boolean>(initialValue: T, paramName: string) => {
  const history = useHistory();
  let paramValue;
  switch (typeof initialValue) {
    case 'number':
      paramValue = Number(parseQueryString(history.location.search)[paramName]);
      break;
    case 'string':
      paramValue = String(parseQueryString(history.location.search)[paramName]);
      break;
    default:
      paramValue = parseQueryString(history.location.search)[paramName] === 'true';
      break;
  }
  const setParamValue = (paramValue: T) => history.replace({ search: updateQueryString(paramName, String(paramValue)) });
  return [paramValue || initialValue, setParamValue] as UseUrlParamsProps;
};

export default useUrlParams;
