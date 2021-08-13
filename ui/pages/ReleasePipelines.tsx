import React from 'react';
import { useQueryParam } from 'use-query-params';
import { ReleasePipelineStats } from '../../shared/types';
import AlertMessage from '../components/common/AlertMessage';
import AppliedFilters from '../components/AppliedFilters';
import Pipeline from '../components/ReleasePipelineHealth';
import { pipelineMetrics } from '../network';
import useFetchForProject from '../hooks/use-fetch-for-project';
import { useRemoveSort } from '../hooks/sort-hooks';
import { filterBySearch } from '../helpers/utils';

const dontFilter = (x: unknown) => Boolean(x);
const bySearch = (search: string) => (pipeline: ReleasePipelineStats) => filterBySearch(search, pipeline.name);
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
  const releaseAnalysis = useFetchForProject(pipelineMetrics);
  const [search] = useQueryParam<string>('search');
  const [nonMasterReleases] = useQueryParam<boolean>('nonMasterReleases');
  const [notStartsWithArtifact] = useQueryParam<boolean>('notStartsWithArtifact');
  const [stageNameExists] = useQueryParam<string>('stageNameExists');
  const [stageNameExistsNotUsed] = useQueryParam<string>('stageNameExistsNotUsed');
  useRemoveSort();

  if (releaseAnalysis === 'loading') return <div>Loading...</div>;
  if (!releaseAnalysis.pipelines.length) return <AlertMessage message="No release pipelines found" />;

  const pipelines = releaseAnalysis.pipelines
    .filter(search === undefined ? dontFilter : bySearch(search))
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
          stagesToHighlight={releaseAnalysis.stagesToHighlight}
        />
      )) : <AlertMessage message="No release pipelines found" />}
    </>
  );
};

export default ReleasePipelines;

