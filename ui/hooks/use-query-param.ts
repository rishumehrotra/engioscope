import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type TypeTranslator<T> = {
  parse: (value: string) => T | undefined;
  serialise: (value: T | undefined) => string | undefined;
};

export const asNumber: TypeTranslator<number> = {
  parse: value => (value === undefined ? undefined : Number(value)),
  serialise: value => value?.toString()
};

export const asBoolean: TypeTranslator<boolean> = {
  parse: value => (value === undefined ? undefined : value === 'true'),
  serialise: value => value?.toString()
};

export const asString: TypeTranslator<string> = {
  parse: value => value,
  serialise: value => (value === '' ? undefined : value)
};

export const asStringArray: TypeTranslator<string[]> = {
  parse: value => (value === undefined ? undefined : value.split(',')),
  serialise: value => value?.join(',')
};

const useQueryParam = <T>(param: string, typeTranslator: TypeTranslator<T>) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const readParam = useMemo(() => {
    const value = searchParams.get(param);
    return value === null ? undefined : typeTranslator.parse(value);
  }, [param, searchParams, typeTranslator]);

  const setParam = useCallback((paramValue: T | undefined, replace?: boolean) => {
    const value = typeTranslator.serialise(paramValue);
    const searchParamsClone = new URLSearchParams(searchParams);
    if (value === undefined) {
      searchParamsClone.delete(param);
    } else {
      searchParamsClone.set(param, value);
    }
    setSearchParams(searchParamsClone, { replace });
  }, [param, searchParams, setSearchParams, typeTranslator]);

  return [readParam, setParam] as const;
};

export default useQueryParam;
