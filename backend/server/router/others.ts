import { t } from './trpc.js';
import { getConfig, queryPeriodDays } from '../../config.js';

export default {
  uiConfig: t.procedure
    .query(() => ({
      hasSummary: Boolean(getConfig().azure.summaryPageGroups?.[0]),
      changeProgramName: getConfig().azure.collections[0]?.changeProgram?.name,
      queryPeriodDays: Math.floor(queryPeriodDays())
    }))
};
