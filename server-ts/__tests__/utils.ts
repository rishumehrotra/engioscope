import { statsStrings } from '../utils';

test('stats strings', () => {
  const [timeRange, timeAverage] = statsStrings('- no value -', n => `${n} mins`);

  expect(timeRange([])).toBe('- no value -');
  expect(timeRange([3])).toBe('3 mins');
  expect(timeRange([3, 1, 2])).toBe('1 mins - 3 mins');

  expect(timeAverage([])).toBe('- no value -');
  expect(timeAverage([1])).toBe('1 mins');
  expect(timeAverage([3, 1, 2])).toBe('2 mins');
});
