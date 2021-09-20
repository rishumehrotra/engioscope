import type { ReleasePipelineStats, RepoAnalysis } from '../../../shared/types';

export default (releaseAnalysis: ReleasePipelineStats[], repoAnalysis: RepoAnalysis[]): RepoAnalysis[] => {
  const pipelinesByRepoName = releaseAnalysis.reduce<Record<string, string[]>>((acc, releasePipeline) => {
    const pipelinesByRepo = Object.keys(releasePipeline.repos)
      .reduce<Record<string, string[]>>((a, repo) => {
        a[repo] = (acc[repo] || []).concat(releasePipeline.name);
        return a;
      }, {});
    return Object.assign(acc, pipelinesByRepo);
  }, {});

  return repoAnalysis.map(r => ({
    ...r,
    pipelineCount: pipelinesByRepoName[r.name]?.length || undefined
  }));
};
