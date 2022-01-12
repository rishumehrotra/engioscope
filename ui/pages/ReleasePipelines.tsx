import React, {
  useCallback, useMemo, useState
} from 'react';
import { useQueryParam } from 'use-query-params';
import { not, pipe } from 'rambda';
import { useParams } from 'react-router-dom';
import type { Pipeline as TPipeline, PipelineStage } from '../../shared/types';
import AlertMessage from '../components/common/AlertMessage';
import AppliedFilters from '../components/AppliedFilters';
import Pipeline from '../components/ReleasePipelineHealth';
import { pipelineMetrics, releaseDefinitions } from '../network';
import useFetchForProject from '../hooks/use-fetch-for-project';
import { useRemoveSort } from '../hooks/sort-hooks';
import { filterBySearch, getSearchTerm } from '../helpers/utils';
import Loading from '../components/Loading';
import ReleasePipelineSummary from '../components/ReleasePipelineSummary';
import type { NormalizedPolicies } from '../components/pipeline-utils';
import {
  normalizePolicy,
  pipelineDeploysExclusivelyFromMaster, pipelineHasStageNamed, pipelineHasUnusedStageNamed,
  pipelineMeetsBranchPolicyRequirements
} from '../components/pipeline-utils';
import InfiniteScrollList from '../components/common/InfiniteScrollList';

const dontFilter = (x: unknown) => Boolean(x);
const filterPipelinesByRepo = (search: string, pipeline: TPipeline) => (
  Object.values(pipeline.repos).some((r => r.name === getSearchTerm(search)))
);
const bySearch = (search: string) => (pipeline: TPipeline) => (
  search.startsWith('repo:')
    ? filterPipelinesByRepo(search, pipeline)
    : filterBySearch(search, pipeline.name) || Object.values(pipeline.repos).some(r => filterBySearch(search, r.name))
);
const byNonMasterReleases = pipe(pipelineDeploysExclusivelyFromMaster, not);
const byNotStartsWithArtifact = (pipeline: TPipeline) => Object.keys(pipeline.repos).length === 0;
const byNonPolicyConforming = (policyForBranch: (repoId: string, branch: string) => NormalizedPolicies) => pipe(
  pipelineMeetsBranchPolicyRequirements(policyForBranch), not
);

const useReleaseDefinitions = () => {
  const [releaseDefinitionCache, setReleaseDefinitionCache] = useState<Record<number, PipelineStage[] | 'loading' | undefined>>({});
  const { collection, project } = useParams<{ collection: string; project: string }>();

  const getReleaseDefinitions = useCallback((definitionIds: number[]) => {
    const needToFetch = definitionIds.filter(id => !releaseDefinitionCache[id]);

    if (!needToFetch.length) return;

    setReleaseDefinitionCache(cache => needToFetch.reduce((d, id) => ({ ...d, [id]: 'loading' }), cache));

    releaseDefinitions(collection, project, [...new Set(needToFetch)])
      .then(revisions => {
        setReleaseDefinitionCache(cache => ({ ...cache, ...revisions }));
      })
      .catch(() => {
        setReleaseDefinitionCache(cache => ({
          ...cache,
          ...needToFetch.reduce((d, id) => ({ ...d, [id]: cache[id] === 'loading' ? undefined : cache[id] }), {})
        }));
      });
  }, [collection, project, releaseDefinitionCache]);

  return [releaseDefinitionCache, getReleaseDefinitions] as const;
};

const ReleasePipelines: React.FC = () => {
  const releaseAnalysis = useFetchForProject(pipelineMetrics);
  const [search] = useQueryParam<string>('search');
  const [nonMasterReleases] = useQueryParam<boolean>('nonMasterReleases');
  const [notStartsWithArtifact] = useQueryParam<boolean>('notStartsWithArtifact');
  const [stageNameExists] = useQueryParam<string>('stageNameExists');
  const [stageNameExistsNotUsed] = useQueryParam<string>('stageNameExistsNotUsed');
  const [nonPolicyConforming] = useQueryParam<boolean>('nonPolicyConforming');
  const [releaseDefinitions, getReleaseDefinitions] = useReleaseDefinitions();
  useRemoveSort();

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

  const setRenderedPipelines = useCallback((renderedPipelines: TPipeline[]) => {
    getReleaseDefinitions(renderedPipelines.map(p => p.id));
  }, [getReleaseDefinitions]);

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
      <InfiniteScrollList
        items={pipelines}
        itemKey={pipeline => pipeline.id}
        onRenderItems={setRenderedPipelines}
        itemRenderer={pipeline => (
          <Pipeline
            pipeline={pipeline}
            stagesToHighlight={releaseAnalysis.stagesToHighlight}
            policyForBranch={policyForBranch}
            ignoreStagesBefore={releaseAnalysis.ignoreStagesBefore}
            releaseDefinition={releaseDefinitions[pipeline.id]}
          />
        )}
      />
    </>
  );
};

export default ReleasePipelines;
