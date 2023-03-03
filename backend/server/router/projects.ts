import type { z } from 'zod';
import { configForProject } from '../../config.js';
import { getBuildPipelineCount } from '../../models/build-definitions.js';
import { collectionAndProjectInputParser } from '../../models/helpers.js';
import { getPipelinesCount as getReleasePipelinesCount } from '../../models/releases.js';
import { getRepoCount } from '../../models/repos.js';
import { memoizeForUI, passInputTo, t } from './trpc.js';

const summary = async ({
  collectionName,
  project,
}: z.infer<typeof collectionAndProjectInputParser>) => {
  const [repos, buildPipelines, releasePipelines] = await Promise.all([
    getRepoCount(collectionName, project),
    getBuildPipelineCount(collectionName, project),
    getReleasePipelinesCount(collectionName, project),
  ]);

  const projectConfig = configForProject(collectionName, project);

  return {
    repos,
    buildPipelines,
    releasePipelines,
    groups: projectConfig?.groupRepos
      ? {
          label: projectConfig.groupRepos.label,
          groups: Object.keys(projectConfig.groupRepos.groups),
        }
      : undefined,
    workItemLabel: projectConfig?.workitems.label,
  };
};

export default t.router({
  summary: t.procedure
    .input(collectionAndProjectInputParser)
    .query(passInputTo(memoizeForUI(summary))),
});
