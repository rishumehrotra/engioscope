import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { exists } from '../../shared/utils.js';
import { trpc } from '../helpers/trpc.js';
import { useCollectionAndProject } from '../hooks/query-hooks.js';
import AlertMessage from './common/AlertMessage.jsx';
import Card from './common/ExpandingCard.jsx';
import { Artifactory, Branches } from './common/Icons.jsx';
import Loading from './Loading.jsx';
import PipelineDiagram from './PipelineDiagram.jsx';

const Artefacts: React.FC<{
  releaseDefinitionId: number;
}> = ({ releaseDefinitionId }) => {
  const { collectionName, project } = useCollectionAndProject();
  const artifactsResponse = trpc.releases.getArtifacts.useQuery({
    collectionName, project, releaseDefnId: releaseDefinitionId
  });
  const projectConfig = trpc.projectConfig.useQuery({ collectionName, project });

  const artifacts = useMemo(() => {
    if (!artifactsResponse.data) return;
    const primary = artifactsResponse.data?.find(a => a.isPrimary);
    const rest = artifactsResponse.data?.filter(a => !a.isPrimary);
    return [primary, ...(rest || [])].filter(exists);
  }, [artifactsResponse.data]);

  return (
    <div className="my-4">
      <div className="uppercase font-semibold text-sm text-gray-800 tracking-wide mb-2">
        Artifacts
      </div>
      <ol className="flex flex-wrap gap-2">
        {/* eslint-disable-next-line no-nested-ternary */}
        {artifacts ? (
          artifacts.length === 0
            ? (
              <li>
                <AlertMessage message="No starting artifact" />
              </li>
            )
            : artifacts.map(artifact => (
              <li key={artifact.type === 'Build' ? (`build-${artifact.name}`) : (`other-${artifact.alias}`)}>
                <div className="inline-flex bg-gray-100 py-3 px-4 rounded-lg">
                  {artifact.type === 'Build' ? (
                    <div className="bg-gray-100 rounded self-start artifact">
                      <Link
                        to={`/${collectionName}/${project}/repos?search="${artifact.name}"`}
                        className="font-semibold flex items-center mb-1 text-blue-600 artifact-title"
                      >
                        {artifact.name}
                      </Link>
                      {artifact.branches.length ? (
                        <ol className="flex flex-wrap">
                          {artifact.branches.map(branch => (
                            <li
                              key={`gone-forward-${branch.name}`}
                              className="mr-1 mb-1 px-2 border-2 rounded-md bg-white flex items-center text-sm"
                            >
                              <Branches className="h-4 mr-1" />
                              {branch.name.replace('refs/heads/', '')}
                              <span
                                className="text-xs border-2 rounded-full px-2 inline-block m-2"
                                data-html
                              >
                                Policies
                              </span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <div className="text-sm mb-2">
                          {`No branches went to ${projectConfig.data?.releasePipelines.ignoreStagesBefore}.`}
                        </div>
                      )}
                      {artifact.additionalBranches?.length ? (
                        <details>
                          <summary className="text-gray-500 text-xs pl-1 mt-1 cursor-pointer">
                            {`${artifact.additionalBranches.length} additional ${
                              artifact.additionalBranches.length === 1 ? 'branch' : 'branches'
                            } that didn't go to ${projectConfig.data?.releasePipelines.ignoreStagesBefore}`}
                          </summary>
                          <ol className="flex flex-wrap mt-2">
                            {artifact.additionalBranches.map(branch => (
                              <li
                                key={`non-gone-ahead${branch.name}`}
                                className="mr-1 mb-1 px-2 border-2 rounded-md bg-white flex items-center text-sm"
                              >
                                <Branches className="h-4 mr-1" />
                                {branch.name.replace('refs/heads/', '')}
                                <span
                                  className="text-xs border-2 rounded-full px-2 inline-block m-2"
                                  data-html
                                >
                                  Policies
                                </span>
                              </li>
                            ))}
                          </ol>
                        </details>
                      ) : null}
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded self-start artifact">
                      {artifact.alias}
                      <div className="mr-1 mb-1 px-2 py-2 mt-1 border-2 rounded-md bg-white flex items-center text-sm">
                        <Artifactory className="h-4 mr-1" />
                        <span>{artifact.source}</span>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))
        )
          : (
            <li>
              <div className="inline-flex bg-gray-100 py-3 px-4 rounded-lg h-4">
                <Loading />
              </div>
            </li>
          )}
      </ol>
    </div>
  );
};

const Stages: React.FC<{ releaseDefinitionId: number }> = ({ releaseDefinitionId }) => {
  const { collectionName, project } = useCollectionAndProject();
  const stages = trpc.releases.releasePipelineStages.useQuery({
    collectionName, project, releaseDefnId: releaseDefinitionId
  });
  return (
    <>
      <div className="uppercase font-semibold text-sm text-gray-800 tracking-wide mt-6">
        Stages
      </div>
      <div className="mt-6">
        {stages.data ? (
          <PipelineDiagram stages={stages.data} />
        ) : (
          <Loading />
        )}
      </div>
    </>
  );
};

export const Pipeline: React.FC<{
  item: {
    id: number;
    url: string;
    name: string;
  };
}> = ({ item: { id, name, url } }) => (
  <Card
    key={id}
    title={name}
    titleUrl={url}
    isExpanded={false}
  >
    <div className="px-6">
      <Artefacts releaseDefinitionId={id} />
      <Stages releaseDefinitionId={id} />
    </div>
  </Card>
);
