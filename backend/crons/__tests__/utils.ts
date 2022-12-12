import { range } from 'rambda';
import { describe, it, expect } from 'vitest';
import { oneDayInMs, oneHourInMs } from '../../../shared/utils.js';
import { createSchedule } from '../utils.js';

const timeAgo = (ms: number) => {
  const d = new Date();
  d.setTime(d.getTime() - ms);
  return d;
};

describe('createSchedule', () => {
  it('should ask for an update at the appropriate time', () => {
    const shouldUpdate = createSchedule({
      frequency: oneHourInMs,
      schedule: s => [
        s`For the first ${oneDayInMs}, check every ${oneHourInMs}.`,
        s`Then till ${3 * oneDayInMs}, check every ${3 * oneHourInMs}.`,
        s`Then till ${6 * oneDayInMs}, check every ${12 * oneHourInMs}.`,
        s`Then till ${18 * oneDayInMs}, check every ${oneDayInMs}.`,
        s`Then till ${33 * oneDayInMs}, check every ${2 * oneDayInMs}.`,
        s`Then till ${60 * oneDayInMs}, check every ${6 * oneDayInMs}.`,
        s`Then till ${90 * oneDayInMs}, check every ${10 * oneDayInMs}.`
      ]
    });

    // Should make the call for the first day
    range(0, 24).forEach(hour => {
      expect(shouldUpdate(timeAgo((hour + 1) * oneHourInMs))).toBe(true);
    });

    // Should only make a call every third attempt after that
    range(24, 72).forEach(hour => {
      if (hour % 3 !== 0) return;
      expect(shouldUpdate(timeAgo((hour + 1) * oneHourInMs))).toBe(false);
      expect(shouldUpdate(timeAgo((hour + 2) * oneHourInMs))).toBe(false);
      expect(shouldUpdate(timeAgo((hour + 3) * oneHourInMs))).toBe(true);
    });

    // And then every twelve attempts after that
    range(72, 144).forEach(hour => {
      if (hour % 12 !== 0) return;
      range(1, 12).forEach(h => {
        expect(shouldUpdate(timeAgo((hour + h) * oneHourInMs))).toBe(false);
      });
      expect(shouldUpdate(timeAgo((hour + 12) * oneHourInMs))).toBe(true);
    });

    // Double-check call at 90 days
    expect(shouldUpdate(timeAgo((90 * oneDayInMs) - oneHourInMs))).toBe(false);
    expect(shouldUpdate(timeAgo(90 * oneDayInMs))).toBe(true);
    expect(shouldUpdate(timeAgo((90 * oneDayInMs) + oneHourInMs))).toBe(false);
    expect(shouldUpdate(timeAgo((90 + 1) * oneDayInMs))).toBe(false);

    // Double check that it's not forgotten
    expect(shouldUpdate(timeAgo((180 * oneDayInMs)))).toBe(true);
    expect(shouldUpdate(timeAgo((270 * oneDayInMs)))).toBe(true);
  });
});
