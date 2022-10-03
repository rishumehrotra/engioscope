import { initTRPC } from '@trpc/server';

export const t = initTRPC.create();

export const passInputTo = <T, U>(fn: (x: T) => U) => ({ input }: { input: T }) => fn(input);
