import { createTRPCReact } from '@trpc/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../backend/server/router';

export const trpc = createTRPCReact<AppRouter>();

export type RouterClient = inferRouterOutputs<AppRouter>;
