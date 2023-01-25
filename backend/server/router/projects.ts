import type { z } from 'zod';
import { collectionAndProjectInputParser } from '../../models/helpers.js';
import { getPipelinesCount } from '../../models/releases.js';
import { getRepoCount } from '../../models/repos.js';
import { passInputTo, t } from './trpc.js';

const summary = async ({
  collectionName,
  project,
}: z.infer<typeof collectionAndProjectInputParser>) => {
  const [repos, pipelines] = await Promise.all([
    getRepoCount(collectionName, project),
    getPipelinesCount(collectionName, project),
  ]);

  return { repos, pipelines };
};

export default t.router({
  summary: t.procedure.input(collectionAndProjectInputParser).query(passInputTo(summary)),
});
