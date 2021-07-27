export const getRatingColor = (rating?: number | string | null): string => {
  if (!rating) return 'red-500';
  if (rating >= 0 && rating < 50) {
    return 'red-500';
  } if (rating >= 50 && rating < 75) {
    return 'yellow-500';
  }
  return 'green-500';
};

export const num = (num: number) => Intl.NumberFormat().format(num);

export const parseQueryString = (qs: string): Record<string, string | undefined> => Object.fromEntries(new URLSearchParams(qs));

export const updateQueryString = (paramName: string, paramValue: string) => {
  const qs = new URLSearchParams(window.location.search);
  if (paramValue === undefined || paramValue === '' || paramValue === 'false' || paramValue === '0') qs.delete(paramName);
  else qs.set(paramName, paramValue);
  return qs.toString();
};

export const shortDate = (date: Date) => (
  Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
);

export const mediumDate = (date: Date) => (
  Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
);
