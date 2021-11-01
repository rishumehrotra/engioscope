export const oneYear = 31536000000;

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

export const createPalette = (colors: string[]) => {
  const cache = new Map<string, string>();
  return (key: string) => {
    if (!cache.has(key)) {
      cache.set(key, colors[cache.size % colors.length]);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return cache.get(key)!;
  };
};

export const contrastColour = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const contrast = (Math.round(r * 299) + Math.round(g * 587) + Math.round(b * 114)) / 1000;

  return (contrast >= 128) ? '#222' : '#fff';
};

export const priorityBasedColor = (priority: number) => {
  switch (priority) {
    case 1:
      return '#F00505';
    case 2:
      return '#FD6104';
    case 3:
      return '#FFCE03';
    default:
      return '#FEF001';
  }
};
