import { oneDayInMs } from '../../shared/utils.js';
import { trpc } from '../helpers/trpc.js';

export default () =>
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  trpc.uiConfig.useQuery(undefined, {
    cacheTime: oneDayInMs,
    placeholderData: {
      hasSummary: false,
      changeProgramName: undefined,
      queryPeriodDays: 90,
    },
  }).data!;
