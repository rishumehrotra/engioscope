import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../backend/server/router';

export const trpc = createTRPCReact<AppRouter>();
