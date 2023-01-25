import { passInputTo, t } from './trpc.js';
import { configForProject, getConfig, queryPeriodDays } from '../../config.js';
import { collectionAndProjectInputParser } from '../../models/helpers.js';

export default {
  uiConfig: t.procedure.query(() => ({
    hasSummary: Boolean(getConfig().azure.summaryPageGroups?.[0]),
    changeProgramName: getConfig().azure.collections[0]?.changeProgram?.name,
    queryPeriodDays: Math.floor(queryPeriodDays()),
  })),

  projectConfig: t.procedure.input(collectionAndProjectInputParser).query(
    passInputTo(({ collectionName, project }) => {
      const projectConfig = configForProject(collectionName, project);

      return {
        releasePipelines: {
          stagesToHighlight: projectConfig?.releasePipelines.stagesToHighlight,
          ignoreStagesBefore: projectConfig?.releasePipelines.ignoreStagesBefore,
        },
      };
    })
  ),
};
