export const incrementIf = <T>(condition: (x: T) => boolean) => (
  (acc: number, value: T) => (condition(value) ? acc + 1 : acc)
);

export const incrementBy = <T>(computeAmount: (x: T) => number) => (
  (acc: number, value: T) => acc + computeAmount(value)
);
