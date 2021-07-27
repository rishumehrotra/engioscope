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

type QueryStringProps = {
  search: string;
}
export const updateQueryString = ({ search }: QueryStringProps) => {
  const qs = new URLSearchParams();
  qs.set('search', search);
  return qs.toString();
};

export const shortDate = (date: Date) => (
  Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
);

export const mediumDate = (date: Date) => (
  Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
);
