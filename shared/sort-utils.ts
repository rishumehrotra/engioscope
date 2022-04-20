export const desc = <T>(sorter: (a: T, b: T) => number) => (a: T, b: T) => -sorter(a, b);
export const asc = <T>(sorter: (a: T, b: T) => number) => sorter;

export const byNum = <T>(fn: (x: T) => number) => (a: T, b: T) => (
  fn(a) - fn(b)
);

export const byDate = <T>(fn: (x: T) => Date) => byNum<T>(x => fn(x).getTime());

export const byString = <T>(fn: (x: T) => string) => (a: T, b: T) => (
  fn(a).localeCompare(fn(b))
);
