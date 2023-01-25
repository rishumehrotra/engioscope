import type { inferAsyncReturnType } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import superjson from 'superjson';

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
