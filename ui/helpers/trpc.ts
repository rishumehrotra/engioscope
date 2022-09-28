import { createTRPCReact } from '@trpc/react';
import type { AppRouter } from '../../backend/server/router';

export const trpc = createTRPCReact<AppRouter>();
