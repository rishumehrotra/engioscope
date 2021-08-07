import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProjectReleasePipelineAnalysis, ReleasePipelineStats } from '../../shared/types';
import AlertMessage from '../components/AlertMessage';
import AppliedFilters from '../components/AppliedFilters';
import Pipeline from '../components/ReleasePipelineHealth';
import createUrlParamsHook from '../hooks/create-url-params-hook';
import { useSetProjectDetails } from '../hooks/project-details-hooks';
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
  const { collection, project } = useParams<{ collection: string; project: string }>();
  const [releaseAnalysis, setReleaseAnalysis] = useState<ProjectReleasePipelineAnalysis | undefined>();
  const setProjectDetails = useSetProjectDetails();
  const [search] = useUrlParams<string>('search');
  const [nonMasterReleases] = useUrlParams<boolean>('nonMasterReleases');
  const [notStartsWithArtifact] = useUrlParams<boolean>('notStartsWithArtifact');
  const [stageNameExists] = useUrlParams<string>('stageNameExists');
  const [stageNameExistsNotUsed] = useUrlParams<string>('stageNameExistsNotUsed');

  useEffect(() => {
    fetchProjectReleaseMetrics(collection, project).then(releasePipelineAnalysis => {
      setReleaseAnalysis(releasePipelineAnalysis);
      setProjectDetails(releasePipelineAnalysis);
    });
  }, [collection, project, setProjectDetails]);

  if (!releaseAnalysis) return <div>Loading...</div>;
  if (!releaseAnalysis.pipelines) return <AlertMessage message="No release pipelines found" />;

  const pipelines = releaseAnalysis.pipelines
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
          stagesToHighlight={releaseAnalysis.stagesToHighlight}
        />
      )) : <AlertMessage message="No release pipelines found" />}
    </>
  );
};

export default ReleasePipelines;

