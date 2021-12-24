import React, { useCallback, useMemo, useState } from 'react';
import { useQueryParam } from 'use-query-params';
import { not, pipe } from 'rambda';
import { useParams } from 'react-router-dom';
import type { Pipeline as TPipeline, PipelineStage } from '../../shared/types';
import AlertMessage from '../components/common/AlertMessage';
import AppliedFilters from '../components/AppliedFilters';
import Pipeline from '../components/ReleasePipelineHealth';
import { pipelineMetrics, releaseDefinition } from '../network';
import useFetchForProject from '../hooks/use-fetch-for-project';
import { useRemoveSort } from '../hooks/sort-hooks';
import { filterBySearch, getSearchTerm } from '../helpers/utils';
import Loading from '../components/Loading';
import ReleasePipelineSummary from '../components/ReleasePipelineSummary';
import usePagination, { bottomItems, topItems } from '../hooks/pagination';
import LoadMore from '../components/LoadMore';
import type { NormalizedPolicies } from '../components/pipeline-utils';
import {
  normalizePolicy,
  pipelineDeploysExclusivelyFromMaster, pipelineHasStageNamed, pipelineHasUnusedStageNamed,
  pipelineMeetsBranchPolicyRequirements
} from '../components/pipeline-utils';

const dontFilter = (x: unknown) => Boolean(x);
const filterPipelinesByRepo = (search: string, pipeline: TPipeline) => (
  Object.entries(pipeline.repos).some(([repoName]) => repoName === getSearchTerm(search))
);
const bySearch = (search: string) => (pipeline: TPipeline) => (search.startsWith('repo:')
  ? filterPipelinesByRepo(search, pipeline) : filterBySearch(search, pipeline.name));
const byNonMasterReleases = pipe(pipelineDeploysExclusivelyFromMaster, not);
const byNotStartsWithArtifact = (pipeline: TPipeline) => Object.keys(pipeline.repos).length === 0;
const byNonPolicyConforming = (policyForBranch: (repoId: string, branch: string) => NormalizedPolicies) => pipe(
  pipelineMeetsBranchPolicyRequirements(policyForBranch), not
);

const useReleaseDefinition = () => {
  const [releaseDefinitionCache, setReleaseDefinitionCache] = useState<Record<number, PipelineStage[] | 'loading' | undefined>>({});
  const { collection, project } = useParams<{ collection: string; project: string }>();
  const loadReleaseDefinition = useCallback(
    (definitionId: number) => {
      if (releaseDefinitionCache[definitionId]) { return; }
      setReleaseDefinitionCache({ ...releaseDefinitionCache, [definitionId]: 'loading' });
      releaseDefinition(collection, project, definitionId)
        .then(
          def => setReleaseDefinitionCache(defs => ({ ...defs, [definitionId]: def }))
        )
        .catch(
          () => setReleaseDefinitionCache(defs => ({ ...defs, [definitionId]: undefined }))
        );
    },
    [collection, project, releaseDefinitionCache]
  );

  const getDefinition = (definitionId: number) => releaseDefinitionCache[definitionId];

  return { loadReleaseDefinition, getDefinition };
};

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

  const { getDefinition, loadReleaseDefinition } = useReleaseDefinition();

  const policyForBranch = useCallback((repoId: string, branch: string): NormalizedPolicies => {
    if (releaseAnalysis === 'loading') return normalizePolicy({});
    return normalizePolicy(releaseAnalysis.policies[repoId]?.[branch] || {});
  }, [releaseAnalysis]);

  const pipelines = useMemo(() => {
    if (releaseAnalysis === 'loading') return [];

    return releaseAnalysis.pipelines
      .filter(search === undefined ? dontFilter : bySearch(search))
      .filter(!nonMasterReleases ? dontFilter : byNonMasterReleases)
      .filter(!notStartsWithArtifact ? dontFilter : byNotStartsWithArtifact)
      .filter(stageNameExists === undefined ? dontFilter : pipelineHasStageNamed(stageNameExists))
      .filter(stageNameExistsNotUsed === undefined ? dontFilter : pipelineHasUnusedStageNamed(stageNameExistsNotUsed))
      .filter(nonPolicyConforming === undefined ? dontFilter : byNonPolicyConforming(policyForBranch));
  }, [
    nonMasterReleases, nonPolicyConforming, notStartsWithArtifact,
    policyForBranch, releaseAnalysis, search, stageNameExists, stageNameExistsNotUsed
  ]);

  const topPipelines = useMemo(() => topItems(page, pipelines), [page, pipelines]);
  const bottomPipelines = useMemo(() => bottomItems(pipelines), [pipelines]);

  if (releaseAnalysis === 'loading') return <Loading />;
  if (!releaseAnalysis.pipelines.length) return <AlertMessage message="No release pipelines found" />;

  return (
    <>
      <div className="flex justify-between items-center my-3 w-full -mt-5">
        <AppliedFilters type="release-pipelines" count={pipelines.length} />
        <ReleasePipelineSummary
          pipelines={pipelines}
          stagesToHighlight={releaseAnalysis.stagesToHighlight}
          policyForBranch={policyForBranch}
          ignoreStagesBefore={releaseAnalysis.ignoreStagesBefore}
        />
      </div>
      {topPipelines.length ? topPipelines.map(pipeline => (
        <Pipeline
          key={pipeline.id}
          pipeline={pipeline}
          stagesToHighlight={releaseAnalysis.stagesToHighlight}
          policyForBranch={policyForBranch}
          ignoreStagesBefore={releaseAnalysis.ignoreStagesBefore}
          releaseDefinition={getDefinition(pipeline.id)}
          loadReleaseDefinition={() => loadReleaseDefinition(pipeline.id)}
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
          policyForBranch={policyForBranch}
          ignoreStagesBefore={releaseAnalysis.ignoreStagesBefore}
          releaseDefinition={getDefinition(pipeline.id)}
          loadReleaseDefinition={() => loadReleaseDefinition(pipeline.id)}
        />
      )) : null}
    </>
  );
};

export default ReleasePipelines;
