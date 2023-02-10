import type { inferAsyncReturnType } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import ExpiryMap from 'expiry-map';
import pMemoize from 'p-memoize';
import superjson from 'superjson';
import { oneMinuteInMs } from '../../../shared/utils.js';

export const trpcContext = ({ req }: CreateExpressContextOptions) => ({
  userId: req.cookies.c as string,
  userAgent: req.headers['user-agent'],
});
type Context = inferAsyncReturnType<typeof trpcContext>;

export const t = initTRPC.context<Context>().create({ transformer: superjson });

export const passInputTo =
  <T, U>(fn: (x: T) => U) =>
  ({ input }: { input: T }) =>
    fn(input);

export const memoizeForUI = <T, U>(fn: (x: T) => Promise<U>) => {
  const cache = new ExpiryMap(5 * oneMinuteInMs);
  return pMemoize(fn, { cacheKey: x => JSON.stringify(x), cache });
};
