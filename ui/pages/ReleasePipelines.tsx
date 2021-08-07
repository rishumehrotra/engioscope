import React from 'react';
import { ProjectReleasePipelineAnalysis, ReleasePipelineStats } from '../../shared/types';
import AlertMessage from '../components/AlertMessage';
import AppliedFilters from '../components/AppliedFilters';
import Pipeline from '../components/ReleasePipelineHealth';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import useListing from '../hooks/use-listing';
import { fetchProjectReleaseMetrics } from '../network';
import { repoPageUrlTypes } from '../types';

const useUrlParams = createUrlParamsHook(repoPageUrlTypes);

const dontFilter = (x: unknown) => Boolean(x);
const bySearchTerm = (searchTerm: string) => (pipeline: ReleasePipelineStats) => (
  pipeline.name.toLowerCase().includes(searchTerm.toLowerCase())
);
const byNonMasterReleases = (pipeline: ReleasePipelineStats) => Object.values(pipeline.repos)
  .some(branches => branches.some(branch => !branch.toLowerCase().includes('master')));
const byNotStartsWithArtifact = (pipeline: ReleasePipelineStats) => Object.keys(pipeline.repos).length === 0;
const byStageNameExists = (stageNameExists: string) => (pipeline: ReleasePipelineStats) => (
  pipeline.stages.some(stage => stage.name.toLowerCase().includes(stageNameExists.toLowerCase()))
);
const byStageNameExistsNotUsed = (stageNameExists: string) => (pipeline: ReleasePipelineStats) => (
  pipeline.stages.some(stage => stage.name.toLowerCase().includes(stageNameExists.toLowerCase()) && stage.releaseCount === 0)
);

const ReleasePipelines: React.FC = () => {
  const releaseAnalysis = useListing<ProjectReleasePipelineAnalysis, ReleasePipelineStats>({
    fetcher: fetchProjectReleaseMetrics,
    list: releaseAnalysis => releaseAnalysis.pipelines
  });
  const [search] = useUrlParams<string>('search');
  const [nonMasterReleases] = useUrlParams<boolean>('nonMasterReleases');
  const [notStartsWithArtifact] = useUrlParams<boolean>('notStartsWithArtifact');
  const [stageNameExists] = useUrlParams<string>('stageNameExists');
  const [stageNameExistsNotUsed] = useUrlParams<string>('stageNameExistsNotUsed');

  if (releaseAnalysis === 'loading') return <div>Loading...</div>;
  if (!releaseAnalysis.list.length) return <AlertMessage message="No release pipelines found" />;

  const pipelines = releaseAnalysis.list
    .filter(search === undefined ? dontFilter : bySearchTerm(search))
    .filter(!nonMasterReleases ? dontFilter : byNonMasterReleases)
    .filter(!notStartsWithArtifact ? dontFilter : byNotStartsWithArtifact)
    .filter(stageNameExists === undefined ? dontFilter : byStageNameExists(stageNameExists))
    .filter(stageNameExistsNotUsed === undefined ? dontFilter : byStageNameExistsNotUsed(stageNameExistsNotUsed));

  return (
    <>
      <AppliedFilters count={pipelines.length} />
      {pipelines.length ? pipelines.map(pipeline => (
        <Pipeline
          key={pipeline.id}
          pipeline={pipeline}
          stagesToHighlight={releaseAnalysis.analysis.stagesToHighlight}
        />
      )) : <AlertMessage message="No release pipelines found" />}
    </>
  );
};

export default ReleasePipelines;

