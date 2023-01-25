import type { ProjectRepoAnalysis } from '../../shared/types.js';
import type { Dev } from '../types.js';

export const aggregateDevs = (projectAnalysis: ProjectRepoAnalysis) =>
  projectAnalysis.repos
    .flatMap(repo =>
      repo.commits.byDev.map<Dev>(d => ({
        name: d.name,
        imageUrl: d.imageUrl,
        repos: [
          {
            name: repo.name,
            byDate: d.byDate,
            changes: d.changes,
          },
        ],
      }))
    )
    .reduce<Record<string, Dev>>(
      (acc, dev) => ({
        ...acc,
        [dev.name]: {
          ...dev,
          repos: [...(acc[dev.name]?.repos || []), ...dev.repos],
        },
      }),
      {}
    );
