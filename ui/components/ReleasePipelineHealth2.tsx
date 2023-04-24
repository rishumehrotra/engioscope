import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import { exists } from '../../shared/utils.js';
import { trpc } from '../helpers/trpc.js';
import { useCollectionAndProject, useQueryContext } from '../hooks/query-hooks.js';
import AlertMessage from './common/AlertMessage.jsx';
import Card from './common/ExpandingCard.jsx';
import Flair from './common/Flair.jsx';
import { Artifactory, Branches, Git } from './common/Icons.jsx';
import Loading from './Loading.jsx';
import PipelineDiagram from './PipelineDiagram.jsx';

const policyNames = {
  'Minimum number of reviewers': 'Minimum number of reviewers',
  'Build': 'Runs builds',
  'Work item linking': 'Requires links to work items',
  'Comment requirements': 'Requires comment resolution',
} as const;

const policyClasses = {
  pass: 'bg-green-500',
  warn: 'bg-yellow-500',
  fail: 'bg-red-500',
} as const;

type PolicyNames = keyof typeof policyNames;

const BranchPolicyPill: React.FC<{
  repositoryId: string;
  refName: string;
  conforms: boolean | undefined;
}> = ({ conforms, repositoryId, refName }) => {
  const { collectionName, project } = useCollectionAndProject();
  const domId = `bdi-${repositoryId}-${refName}`;
  const [hasHovered, setHasHovered] = useState(false);
  const branchPolicies = trpc.repos.getBranchPolicies.useQuery(
    { collectionName, project, repositoryId, refName },
    { enabled: hasHovered }
  );

  const isOptional = useCallback(
    (policyName: PolicyNames) => {
      if (branchPolicies.status === 'loading') return false;
      return !(branchPolicies.data?.[policyName]?.isBlocking ?? true);
    },
    [branchPolicies.data, branchPolicies.status]
  );

  const policyClassName = useCallback(
    (policyName: PolicyNames) => {
      if (branchPolicies.status === 'loading') return '';
      const policy = branchPolicies.data?.[policyName];
      if (!policy) return policyClasses.fail;

      if (!policy.isEnabled) return policyClasses.fail;
      if (policy.isEnabled && !policy.isBlocking) return policyClasses.warn;

      if (policyName === 'Minimum number of reviewers') {
        return (policy.minimumApproverCount || 0) > 1
          ? policyClasses.pass
          : policyClasses.warn;
      }

      return policyClasses.pass;
    },
    [branchPolicies.data, branchPolicies.status]
  );

  return (
    <>
      <span
        className={`text-xs border-2 rounded-full px-2 inline-block m-2 ${
          conforms ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
        }`}
        onMouseOver={() => setHasHovered(true)}
        onFocus={() => setHasHovered(true)}
        data-tip
        data-for={domId}
      >
        Policies
      </span>
      <ReactTooltip id={domId} place="bottom">
        <div className="w-72 pt-2 text-left whitespace-normal">
          <div className="mb-2 leading-snug">
            <strong>Branch policies</strong>
            {Object.entries(policyNames).map(([p, displayName]) => {
              const policyName = p as PolicyNames;

              return (
                <div key={policyName}>
                  <ul className="w-72">
                    <span
                      className={`rounded inline-block w-2 h-2 mr-1 ${policyClassName(
                        policyName
                      )}`}
                    />
                    {displayName}
                    {isOptional(policyName) ? ' (optional)' : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </ReactTooltip>
    </>
  );
};

const Artefacts: React.FC<{
  releaseDefinitionId: number;
}> = ({ releaseDefinitionId }) => {
  const { collectionName, project } = useCollectionAndProject();
  const artifactsResponse = trpc.releases.getArtifacts.useQuery({
    queryContext: useQueryContext(),
    releaseDefnId: releaseDefinitionId,
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
        {}
        {artifacts ? (
          artifacts.length === 0 ? (
            <li>
              <AlertMessage message="No starting artifact" />
            </li>
          ) : (
            artifacts.map(artifact => (
              <li
                key={`${artifact.type}-${
                  artifact.type === 'Build' ? artifact.name : artifact.alias
                }`}
              >
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
                              <BranchPolicyPill
                                repositoryId={artifact.repoId}
                                refName={branch.name}
                                conforms={branch.conforms}
                              />
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
                              artifact.additionalBranches.length === 1
                                ? 'branch'
                                : 'branches'
                            } that didn't go to ${
                              projectConfig.data?.releasePipelines.ignoreStagesBefore
                            }`}
                          </summary>
                          <ol className="flex flex-wrap mt-2">
                            {artifact.additionalBranches.map(branch => (
                              <li
                                key={`non-gone-ahead${branch.name}`}
                                className="mr-1 mb-1 px-2 border-2 rounded-md bg-white flex items-center text-sm"
                              >
                                <Branches className="h-4 mr-1" />
                                {(branch.name || '(unknown)').replace('refs/heads/', '')}
                                <BranchPolicyPill
                                  repositoryId={artifact.repoId}
                                  refName={branch.name}
                                  conforms={branch.conforms}
                                />
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
                        {artifact.type === 'Artifactory' ? (
                          <Artifactory className="h-4 mr-1" />
                        ) : (
                          <Git className="h-4 mr-1" />
                        )}
                        <span>{artifact.source}</span>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))
          )
        ) : (
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
  const stages = trpc.releases.releasePipelineStages.useQuery({
    queryContext: useQueryContext(),
    releaseDefnId: releaseDefinitionId,
  });
  return (
    <>
      <div className="uppercase font-semibold text-sm text-gray-800 tracking-wide mt-6">
        Stages
      </div>
      <div className="mt-6">
        {stages.data ? <PipelineDiagram stages={stages.data} /> : <Loading />}
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
}> = ({ item: { id, name, url } }) => {
  const { collectionName, project } = useCollectionAndProject();
  const projectConfig = trpc.projectConfig.useQuery({ collectionName, project });
  const stages = trpc.releases.releasePipelineStages.useQuery({
    queryContext: useQueryContext(),
    releaseDefnId: id,
  });

  const stagesToHighlight = projectConfig.data?.releasePipelines.stagesToHighlight;

  return (
    <Card
      key={id}
      title={name}
      titleUrl={url}
      isExpanded={false}
      subtitle={stagesToHighlight?.map(stageToHighlight => {
        const matchingStage = stages.data?.find(s =>
          s.name.toLowerCase().includes(stageToHighlight.toLowerCase())
        );
        const doesStageExist = Boolean(matchingStage);
        const isStageUsed = Boolean((matchingStage?.total || 0) > 0);

        return (
          <Flair
            key={stageToHighlight}
            colorClassName={
              doesStageExist && isStageUsed
                ? 'bg-green-600'
                : doesStageExist
                ? 'bg-yellow-400'
                : 'bg-gray-400'
            }
            label={`${stageToHighlight}: ${
              doesStageExist ? `${isStageUsed ? 'Used' : 'Unused'}` : "Doesn't exist"
            }`}
          />
        );
      })}
    >
      <div className="px-6">
        <Artefacts releaseDefinitionId={id} />
        <Stages releaseDefinitionId={id} />
      </div>
    </Card>
  );
};
