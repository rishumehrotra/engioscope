import type { ReleasePipelineStats, RepoAnalysis } from '../../../shared/types.js';

export default (
  releaseAnalysis: ReleasePipelineStats,
  repoAnalysis: RepoAnalysis[]
): RepoAnalysis[] => {
  const pipelinesByRepoName = releaseAnalysis.pipelines.reduce<Record<string, string[]>>(
    (acc, releasePipeline) => {
      const pipelinesByRepo = Object.values(releasePipeline.repos).reduce<
        Record<string, string[]>
      >((a, { name }) => {
        a[name] = (acc[name] || []).concat(releasePipeline.name);
        return a;
      }, {});
      return Object.assign(acc, pipelinesByRepo);
    },
    {}
  );

  return repoAnalysis.map(r => ({
    ...r,
    pipelineCount: pipelinesByRepoName[r.name]?.length || undefined,
  }));
};
