import { TopLevelIndicator } from '../../../shared-types';

const clamp = (min: number, max: number) => (num: number) => (
  Math.min(Math.max(num, min), max)
);

const clampBetweenZeroAndHundred = clamp(0, 100);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const ratingFromScore = (score: string) => ({
  '1.0': 100,
  '2.0': 74,
  '3.0': 49,
  '4.0': 24,
  '5.0': 0
}[score]!);

export const devsPerTeam = 2;
export const workingDaysPerMonth = 25;
export const daysPerMonth = 30;
export const defaultReducingFactor = 10;
// TODO: Fix the '30' below
export const devsPerTeamPerDay = (devsPerTeam * workingDaysPerMonth * 30) / daysPerMonth;
export const devsPerTeamPerMonth = (devsPerTeam * 30) / daysPerMonth;
export const devsPerTeamPerMonthPlusOne = (devsPerTeam * 30) / daysPerMonth + 1;

export const deviation = (baseline: number, reducingFactor: number) => (value: number) => {
  const rating = 100 - ((value - baseline) * reducingFactor);
  return Math.ceil(clampBetweenZeroAndHundred(rating));
};

export const percent = (baseline: number) => (value: number) => (
  Math.min(Math.ceil((value * 100) / baseline), 100)
);

export const remainingFrom = (baseline: number) => (value: number) => (
  Math.ceil(baseline - value)
);

export const inversePercent = (baseline: number) => (value: number) => (
  (value === 0) ? 100 : Math.min(Math.ceil((baseline * 100) / value), 100)
);

export const inversePercentWith0AsUnfit = (baseline: number) => (value: number) => {
  if (value === 0) return 0;
  return Math.min(Math.ceil((baseline * 100) / value), 100);
};

export const average = (valueArr: number[]) => (
  valueArr.length
    ? Math.ceil(valueArr.reduce((a, b) => a + b, 0) / valueArr.length)
    : 0
);

export const withOverallRating = (topLevelIndicator: Omit<TopLevelIndicator, 'rating'>): TopLevelIndicator => ({
  ...topLevelIndicator,
  rating: average(topLevelIndicator.indicators.map(
    i => (Number.isNaN(Number(i.rating)) ? 0 : i.rating)
  ))
});

export const qualityGateRating = (qualityGate: string) => {
  switch (qualityGate) {
    case 'ERROR': return 0;
    case 'WARN': return 74;
    default: return 100;
  }
};

export const percentOutOf100 = percent(100);

