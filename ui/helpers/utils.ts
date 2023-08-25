import prettyMilliseconds from 'pretty-ms';
import {
  divide,
  oneDayInMs,
  oneHourInMs,
  oneMinuteInMs,
  oneSecondInMs,
  oneWeekInMs,
  toPercentage,
} from '../../shared/utils.js';
import type { QualityGateStatus } from '../../shared/types.js';

export const oneYear = 1000 * 60 * 60 * 24 * 365;

export const num = (num: number) => Intl.NumberFormat().format(num);

export const shortDate = (date: Date) => {
  if (Date.now() - date.getTime() > oneYear) {
    return Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }
  return Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
};

export const mediumDate = (date: Date) =>
  Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

export const relativeTime = (date: Date): string => {
  const currentTime = Date.now();
  const timestamp = date.getTime();
  const timeDifference = currentTime - timestamp;

  if (timeDifference < oneWeekInMs) {
    const units = [
      { label: 'day', duration: oneDayInMs },
      { label: 'hour', duration: oneHourInMs },
      { label: 'minute', duration: oneMinuteInMs },
      { label: 'second', duration: oneSecondInMs },
    ];

    const unit = units.find(unit => Math.floor(timeDifference / unit.duration) >= 1);
    if (unit) {
      const value = Math.floor(timeDifference / unit.duration);
      return `${value} ${unit.label}${value > 1 ? 's' : ''} ago`;
    }
  }

  return `on ${shortDate(new Date(timestamp))}`;
};

export const formatDebt = (debtInMins: number) => {
  if (debtInMins > 60 && debtInMins < 60 * 24) {
    return `${Math.ceil(debtInMins / 60)} hrs`;
  }
  if (debtInMins > 24 * 60) {
    return `${Math.ceil(debtInMins / (60 * 8))} days`;
  }
  return `${debtInMins} mins`;
};

export const generateId = () =>
  Math.random()
    .toString(36)
    .replaceAll(/[^a-z]+/g, '')
    .slice(2, 10);

export const dontFilter = Boolean;

const isWrappedAroundQuotes = (search: string) =>
  search.startsWith('"') && search.endsWith('"');
export const getSearchTerm = (search: string) => search.split('"')[1];

export const filterBySearch = (search: string, item: string) =>
  isWrappedAroundQuotes(search)
    ? item === getSearchTerm(search)
    : item.toLowerCase().includes(search.toLowerCase());

export const exists = <T>(x: T | undefined | null): x is T =>
  x !== null && x !== undefined;

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
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);

  const contrast =
    (Math.round(r * 299) + Math.round(g * 587) + Math.round(b * 114)) / 1000;

  return contrast >= 128 ? '#222' : '#fff';
};

export const priorityBasedColor = (priority: number) => {
  switch (priority) {
    case 1: {
      return '#F00505';
    }
    case 2: {
      return '#FD6104';
    }
    case 3: {
      return '#FFCE03';
    }
    default: {
      return '#FEF001';
    }
  }
};

export const prettyMS = (ms: number) =>
  prettyMilliseconds(ms, { unitCount: ms > oneYear ? 2 : 1 });

export const getWeekDates = (week: number, year: number) => {
  const firstDayOfYear = new Date(year, 0, 1);
  const start = new Date(firstDayOfYear.getTime() + week * oneWeekInMs);
  const end = new Date(start.getTime() + 6 * oneDayInMs);
  return {
    start: start.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    end: end.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  };
};

export const getMonthName = (monthNumber: number) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (monthNumber < 1 || monthNumber > 12) return 'Invalid Month Number';
  return months[monthNumber - 1];
};

// Based on https://2ality.com/2019/12/intl-pluralrules.html
const pluralRules = new Intl.PluralRules('en-US');
export const pluralise = (count: number, singular: string, plural: string) => {
  return pluralRules.select(count) === 'one'
    ? `${num(count)} ${singular}`
    : `${num(count)} ${plural}`;
};

export const minPluralise = (count: number, singular: string, plural: string) => {
  return pluralRules.select(count) === 'one' ? singular : plural;
};

export const combinedQualityGate = (qualityGateStatus: QualityGateStatus[]) => {
  if (qualityGateStatus.length === 0) return 'unknown';
  if (qualityGateStatus.length === 1) return qualityGateStatus[0];
  const qualityGatesPassed = qualityGateStatus.filter(status => status !== 'fail');

  return `${divide(qualityGatesPassed.length, qualityGateStatus.length)
    .map(toPercentage)
    .getOr('-')} pass`;
};
