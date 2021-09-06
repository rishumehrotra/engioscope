import React, { useEffect, useMemo } from 'react';
import { useQueryParam } from 'use-query-params';
import ReactTooltip from 'react-tooltip';
import type { ReleasePipelineStats } from '../../shared/types';
import AlertMessage from '../components/common/AlertMessage';
import AppliedFilters from '../components/AppliedFilters';
import Pipeline from '../components/ReleasePipelineHealth';
import { pipelineMetrics } from '../network';
import useFetchForProject from '../hooks/use-fetch-for-project';
import { useRemoveSort } from '../hooks/sort-hooks';
import { filterBySearch, getSearchTerm } from '../helpers/utils';
import Loading from '../components/Loading';

const dontFilter = (x: unknown) => Boolean(x);
const filterPipelinesByRepo = (search: string, pipeline: ReleasePipelineStats) => (
  Object.entries(pipeline.repos).some(([repoName]) => repoName === getSearchTerm(search))
);
const bySearch = (search: string) => (pipeline: ReleasePipelineStats) => (search.startsWith('repo:')
  ? filterPipelinesByRepo(search, pipeline) : filterBySearch(search, pipeline.name));
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

  const pipelines = useMemo(() => {
    if (releaseAnalysis === 'loading') return [];

    return releaseAnalysis.pipelines
      .filter(search === undefined ? dontFilter : bySearch(search))
      .filter(!nonMasterReleases ? dontFilter : byNonMasterReleases)
      .filter(!notStartsWithArtifact ? dontFilter : byNotStartsWithArtifact)
      .filter(stageNameExists === undefined ? dontFilter : byStageNameExists(stageNameExists))
      .filter(stageNameExistsNotUsed === undefined ? dontFilter : byStageNameExistsNotUsed(stageNameExistsNotUsed));
  }, [releaseAnalysis, search, nonMasterReleases, notStartsWithArtifact, stageNameExists, stageNameExistsNotUsed]);

  useEffect(() => { ReactTooltip.rebuild(); }, [pipelines]);

  if (releaseAnalysis === 'loading') return <Loading />;
  if (!releaseAnalysis.pipelines.length) return <AlertMessage message="No release pipelines found" />;

  return (
    <>
      <AppliedFilters type="release-pipelines" count={pipelines.length} />
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

