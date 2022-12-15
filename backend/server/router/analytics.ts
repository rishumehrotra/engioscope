import { z } from 'zod';
import { recordPageView } from '../../models/analytics.js';
import { t } from './trpc.js';

export default t.router({
  recordPageView: t.procedure
    .input(z.object({ path: z.string() }))
    .mutation(({ ctx, input }) => (
      ctx.userAgent
        ? recordPageView(input.path, ctx.userId, ctx.userAgent)
          .then(() => 'All your base are belong to us')
        : null
    ))
});
