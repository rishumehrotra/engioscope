import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

export const t = initTRPC.create({
  transformer: superjson
});

export const passInputTo = <T, U>(fn: (x: T) => U) => ({ input }: { input: T }) => fn(input);
