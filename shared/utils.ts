export const exists = <T>(x: T | undefined | null): x is T => (
  x !== null && x !== undefined
);
