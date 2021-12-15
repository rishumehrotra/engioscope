import React, { useMemo } from 'react';
import { useQueryParam } from 'use-query-params';
import { not, pipe } from 'rambda';
import type { ReleasePipelineStats } from '../../shared/types';
import AlertMessage from '../components/common/AlertMessage';
import AppliedFilters from '../components/AppliedFilters';
import Pipeline from '../components/ReleasePipelineHealth';
import { pipelineMetrics } from '../network';
import useFetchForProject from '../hooks/use-fetch-for-project';
import { useRemoveSort } from '../hooks/sort-hooks';
import { filterBySearch, getSearchTerm } from '../helpers/utils';
import Loading from '../components/Loading';
import ReleasePipelineSummary from '../components/ReleasePipelineSummary';
import usePagination, { bottomItems, topItems } from '../hooks/pagination';
import LoadMore from '../components/LoadMore';
import {
  pipelineDeploysExclusivelyFromMaster, pipelineHasStageNamed, pipelineHasUnusedStageNamed,
  pipelineMeetsBranchPolicyRequirements
} from '../components/pipeline-utils';

const dontFilter = (x: unknown) => Boolean(x);
const filterPipelinesByRepo = (search: string, pipeline: ReleasePipelineStats) => (
  Object.entries(pipeline.repos).some(([repoName]) => repoName === getSearchTerm(search))
);
const bySearch = (search: string) => (pipeline: ReleasePipelineStats) => (search.startsWith('repo:')
  ? filterPipelinesByRepo(search, pipeline) : filterBySearch(search, pipeline.name));
const byNonMasterReleases = (ignoreStagesBefore?: string) => pipe(pipelineDeploysExclusivelyFromMaster(ignoreStagesBefore), not);
const byNotStartsWithArtifact = (pipeline: ReleasePipelineStats) => Object.keys(pipeline.repos).length === 0;
const byNonPolicyConforming = (ignoreStagesBefore?: string) => pipe(
  pipelineMeetsBranchPolicyRequirements(ignoreStagesBefore), not
);

const ReleasePipelines: React.FC = () => {
  const releaseAnalysis = useFetchForProject(pipelineMetrics);
  const [search] = useQueryParam<string>('search');
  const [nonMasterReleases] = useQueryParam<boolean>('nonMasterReleases');
  const [notStartsWithArtifact] = useQueryParam<boolean>('notStartsWithArtifact');
  const [stageNameExists] = useQueryParam<string>('stageNameExists');
  const [stageNameExistsNotUsed] = useQueryParam<string>('stageNameExistsNotUsed');
  const [nonPolicyConforming] = useQueryParam<boolean>('nonPolicyConforming');
  const [page, loadMore] = usePagination();
  useRemoveSort();

  const pipelines = useMemo(() => {
    if (releaseAnalysis === 'loading') return [];

    return releaseAnalysis.pipelines
      .filter(search === undefined ? dontFilter : bySearch(search))
      .filter(!nonMasterReleases ? dontFilter : byNonMasterReleases(releaseAnalysis.ignoreStagesBefore))
      .filter(!notStartsWithArtifact ? dontFilter : byNotStartsWithArtifact)
      .filter(stageNameExists === undefined ? dontFilter : pipelineHasStageNamed(stageNameExists))
      .filter(stageNameExistsNotUsed === undefined ? dontFilter : pipelineHasUnusedStageNamed(stageNameExistsNotUsed))
      .filter(nonPolicyConforming === undefined ? dontFilter : byNonPolicyConforming(releaseAnalysis.ignoreStagesBefore));
  }, [nonMasterReleases, nonPolicyConforming, notStartsWithArtifact, releaseAnalysis, search, stageNameExists, stageNameExistsNotUsed]);

  const topPipelines = useMemo(() => topItems(page, pipelines), [page, pipelines]);
  const bottomPipelines = useMemo(() => bottomItems(pipelines), [pipelines]);

  if (releaseAnalysis === 'loading') return <Loading />;
  if (!releaseAnalysis.pipelines.length) return <AlertMessage message="No release pipelines found" />;

  return (
    <>
      <div className="flex justify-between items-center my-3 w-full -mt-5">
        <AppliedFilters type="release-pipelines" count={pipelines.length} />
        <ReleasePipelineSummary pipelines={pipelines} stagesToHighlight={releaseAnalysis.stagesToHighlight} />
      </div>
      {topPipelines.length ? topPipelines.map(pipeline => (
        <Pipeline
          key={pipeline.id}
          pipeline={pipeline}
          stagesToHighlight={releaseAnalysis.stagesToHighlight}
        />
      )) : null}

      <LoadMore
        loadMore={loadMore}
        hiddenItemsCount={pipelines.length - topPipelines.length - bottomPipelines.length}
      />

      {bottomPipelines.length ? bottomPipelines.map(pipeline => (
        <Pipeline
          key={pipeline.id}
          pipeline={pipeline}
          stagesToHighlight={releaseAnalysis.stagesToHighlight}
        />
      )) : null}
    </>
  );
};

export default ReleasePipelines;

