const isNullish = <T>(value: T | null | undefined): value is null | undefined => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && (Number.isNaN(value) || !Number.isFinite(value))) {
    return true;
  }
  return false;
};

type Maybe<T> = {
  map: <U>(f: (value: T) => U) => Maybe<U>;
  flatMap: <U>(f: (value: T) => Maybe<U>) => Maybe<U>;
  getOr: <U>(defaultValue: U) => T | U;
};

export const maybe = <T>(value: T | null | undefined): Maybe<T> => ({
  map: <U>(fn: (value: T) => U) =>
    isNullish(value) ? maybe(value as unknown as U) : maybe(fn(value)),
  flatMap: <U>(fn: (value: T) => Maybe<U>) =>
    isNullish(value) ? maybe(value as unknown as U) : fn(value),
  getOr: defaultValue => (isNullish(value) ? defaultValue : value),
});
