export const num = (num: number) => Intl.NumberFormat().format(num);

export const shortDate = (date: Date) => (
  Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
);

export const mediumDate = (date: Date) => (
  Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
);

export const formatDebt = (debtInMins: number) => {
  if (debtInMins > 60 && debtInMins < (60 * 24)) {
    return `${Math.ceil((debtInMins / 60))} hrs`;
  } if (debtInMins > 24 * 60) {
    return `${Math.ceil((debtInMins / (60 * 8)))} days`;
  }
  return `${debtInMins} mins`;
};

export const generateId = () => (
  Math.random().toString(36).replace(/[^a-z]+/g, '').substr(2, 10)
);

export const dontFilter = (x: unknown) => Boolean(x);

const isWrappedAroundQuotes = (search: string) => search.startsWith('"') && search.endsWith('"');
export const getSearchTerm = (search: string) => search.split('"')[1];

export const filterBySearch = (search: string, item: string) => (isWrappedAroundQuotes(search)
  ? (item === getSearchTerm(search)) : item.toLowerCase().includes(search.toLowerCase()));

export const exists = <T>(x: T | undefined | null): x is T => (
  x !== null && x !== undefined
);
