import type { z } from 'zod';
import { collectionAndProjectInputParser } from '../../models/helpers.js';
import { repoCount } from '../../models/repos.js';
import { passInputTo, t } from './trpc.js';

const summary = async ({ collectionName, project }: z.infer<typeof collectionAndProjectInputParser>) => {
  const [repos] = await Promise.all([
    repoCount(collectionName, project)
  ]);

  return { repos };
};

export default t.router({
  summary: t.procedure
    .input(collectionAndProjectInputParser)
    .query(passInputTo(summary))
});
