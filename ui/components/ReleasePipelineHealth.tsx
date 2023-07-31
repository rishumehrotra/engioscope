import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { twJoin } from 'tailwind-merge';
import { AlertTriangle } from 'react-feather';
import { byNum } from 'sort-lib';
import { exists } from '../../shared/utils.js';
import type { RouterClient } from '../helpers/trpc.js';
import { trpc } from '../helpers/trpc.js';
import { useCollectionAndProject, useQueryContext } from '../hooks/query-hooks.js';
import { Artifactory2, BuildPipeline, Git2 } from './common/Icons.jsx';
import Loading from './Loading.jsx';
import PipelineDiagram from './PipelineDiagram.jsx';
import BranchPolicyPill from './BranchPolicyPill.jsx';
import { minPluralise } from '../helpers/utils.js';

const ArtifactIcon = ({
  type,
}: {
  type: RouterClient['releases']['releasePipelineDetails']['artifacts'][number]['type'];
}) => {
  if (type === 'Build') {
    return (
      <span
        data-tooltip-id="react-tooltip"
        data-tooltip-content="This artifact is generated from a build pipeline"
      >
        <BuildPipeline className="text-theme-icon" size={18} />
      </span>
    );
  }
  if (type === 'Artifactory') {
    return (
      <span
        data-tooltip-id="react-tooltip"
        data-tooltip-content="This artifact is downloaded from JFrog Artifactory"
      >
        <Artifactory2 size={18} />
      </span>
    );
  }
  return (
    <span
      data-tooltip-id="react-tooltip"
      data-tooltip-content={`This artifact is from ${type}`}
    >
      <Git2 className="text-theme-icon" size={18} />
    </span>
  );
};

const Artefacts: React.FC<{
  artefacts?: RouterClient['releases']['releasePipelineDetails']['artifacts'];
}> = ({ artefacts }) => {
  const { collectionName, project } = useCollectionAndProject();
  const projectConfig = trpc.projectConfig.useQuery({ collectionName, project });

  const as = useMemo(() => {
    if (!artefacts) return;
    const primary = artefacts.find(a => a.isPrimary);
    const rest = artefacts.filter(a => !a.isPrimary);
    return [primary, ...(rest || [])].filter(exists);
  }, [artefacts]);

  const groupedArtifacts = useMemo(() => {
    if (!artefacts) return;

    return Object.values(
      artefacts.reduce<Record<string, typeof artefacts>>((acc, a) => {
        acc[a.type] ||= [];
        acc[a.type].push(a);

        return acc;
      }, {})
    );
  }, [artefacts]);

  return (
    <div className="my-4">
      <div className="uppercase text-xs mb-2 bg-theme-hover border-y border-y-theme-seperator py-2 px-6">
        Artifacts
      </div>
      {as ? (
        as.length === 0 ? (
          <p className="flex px-6 py-1 gap-2 items-center text-theme-danger">
            <AlertTriangle size={18} />
            <span>No artifacts</span>
          </p>
        ) : (
          <ol className="mx-6">
            {groupedArtifacts?.flatMap(group => {
              const isBuildPipeline = group[0].type === 'Build';

              if (isBuildPipeline) {
                return group.map(artifact => {
                  if (artifact.type !== 'Build') return null;
                  return (
                    <li className="grid grid-cols-[min-content_1fr] gap-2 mb-2">
                      <div className="justify-self-center pt-1">
                        <ArtifactIcon type="Build" />
                      </div>
                      <div className="items-start">
                        {artifact.branches.length ? (
                          <ol className="flex flex-wrap gap-2">
                            <li className="inline-block mb-1">
                              <Link
                                to={`/${collectionName}/${project}/repos?search="${artifact.name}"`}
                                className="link-text whitespace-nowrap"
                              >
                                {artifact.name}
                              </Link>
                            </li>
                            {artifact.branches
                              .sort(byNum(x => (x.conforms ? 0 : 1)))
                              .map(branch => (
                                <li key={`gone-forward-${branch.name}`}>
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
                            <summary className="text-gray-500 text-xs pl-0 cursor-pointer">
                              {` ${
                                artifact.additionalBranches.length
                              } additional ${minPluralise(
                                artifact.additionalBranches.length,
                                'branch',
                                'branches'
                              )} that didn't go to ${projectConfig.data?.releasePipelines
                                .ignoreStagesBefore}`}
                            </summary>
                            <ol className="flex flex-wrap gap-2 mt-2 pl-3">
                              {artifact.additionalBranches.map(branch => (
                                <li key={`non-gone-ahead${branch.name}`}>
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
                    </li>
                  );
                });
              }

              return (
                <li className="grid grid-cols-[min-content_1fr] gap-2 mb-2">
                  <div className="justify-self-center pt-1.5 text-theme-icon">
                    <ArtifactIcon type={group[0].type} />
                  </div>
                  <ul className="flex gap-2 pt-1">
                    {group.map(artifact => {
                      if (artifact.type === 'Build') return null;
                      return (
                        <li className="border border-theme-input px-1 text-sm rounded">
                          {artifact.alias}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        )
      ) : (
        <li>
          <div className="inline-flex bg-gray-100 py-3 px-4 rounded-lg h-4">
            <Loading />
          </div>
        </li>
      )}
    </div>
  );
};

const Stages: React.FC<{
  stages: RouterClient['releases']['releasePipelineDetails']['stages'];
}> = ({ stages }) => {
  return (
    <>
      <div className="uppercase text-xs mb-2 bg-theme-hover border-y border-y-theme-seperator py-2 px-6">
        Stages
      </div>
      <div className="m-6">
        {stages ? <PipelineDiagram stages={stages} /> : <Loading />}
      </div>
    </>
  );
};

const ReleasePipelineHealth: React.FC<{
  item: {
    id: number;
    url: string;
    name: string;
  };
}> = ({ item: { id, name, url } }) => {
  const { collectionName, project } = useCollectionAndProject();
  const projectConfig = trpc.projectConfig.useQuery({ collectionName, project });
  const releasePipelineDetails = trpc.releases.releasePipelineDetails.useQuery({
    queryContext: useQueryContext(),
    releaseDefnId: id,
  });

  const stagesToHighlight = projectConfig.data?.releasePipelines.stagesToHighlight;

  return (
    <div
      className={twJoin(
        'rounded border border-theme-seperator mb-6 group bg-theme-page-content',
        'shadow-sm hover:shadow-md transition-shadow duration-200'
      )}
    >
      <h3 className="m-6 mb-2">
        <a
          href={url}
          className="group-hover:text-theme-highlight hover:underline font-medium"
        >
          {name}
        </a>
        {stagesToHighlight?.map(stageToHighlight => {
          const matchingStage = releasePipelineDetails.data?.stages?.find(s =>
            s.name.toLowerCase().includes(stageToHighlight.toLowerCase())
          );
          const doesStageExist = Boolean(matchingStage);
          const isStageUsed = Boolean((matchingStage?.total || 0) > 0);

          return (
            <span
              key={stageToHighlight}
              className={twJoin(
                'text-sm px-2 inline-block ml-2 rounded-md',
                doesStageExist && isStageUsed
                  ? 'bg-theme-success-dim'
                  : doesStageExist
                  ? 'bg-theme-warn-dim'
                  : 'bg-theme-danger-dim'
              )}
            >
              {`${stageToHighlight} ${
                doesStageExist ? `${isStageUsed ? 'used' : 'unused'}` : "doesn't exist"
              }`}
            </span>
          );
        })}
      </h3>
      <ul className="ml-6 inline-flex gap-2 text-theme-helptext">
        <li className="border-r border-theme-seperator pr-2">
          <strong className="text-theme-base">
            {releasePipelineDetails.data?.artifacts.length}
          </strong>
          {` ${minPluralise(
            releasePipelineDetails.data?.artifacts.length || 0,
            'artifact',
            'artifacts'
          )} `}
        </li>
        <li>
          <strong className="text-theme-base">
            {releasePipelineDetails.data?.stages?.length}
          </strong>
          {` ${minPluralise(
            releasePipelineDetails.data?.stages?.length || 0,
            'stage',
            'stages'
          )} `}
        </li>
      </ul>
      <Artefacts artefacts={releasePipelineDetails.data?.artifacts} />
      <Stages stages={releasePipelineDetails.data?.stages} />
    </div>
  );
};

export default ReleasePipelineHealth;
