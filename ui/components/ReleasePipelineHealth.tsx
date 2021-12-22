import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  Pipeline as TPipeline, RelevantPipelineStage
} from '../../shared/types';
import { num } from '../helpers/utils';
import AlertMessage from './common/AlertMessage';
import Card from './common/ExpandingCard';
import Flair from './common/Flair';
import { ArrowRight, Branches } from './common/Icons';
import Metric from './Metric';
import type { NormalizedPolicies } from './pipeline-utils';
import {
  fullPolicyStatus, pipelineHasStageNamed, pipelineUsesStageNamed, policyStatus
} from './pipeline-utils';

const policyColorClass = (policy: NormalizedPolicies, key: keyof NormalizedPolicies) => {
  const status = policyStatus(policy, key);
  if (status === 'pass') return 'bg-green-500';
  if (status === 'warn') return 'bg-yellow-500';
  return 'bg-red-500';
};

const aggregatePolicyColorClass = (policy: NormalizedPolicies) => {
  const status = fullPolicyStatus(policy);
  if (status === 'pass') return 'text-green-700 bg-green-50';
  if (status === 'warn') return 'text-yellow-700 bg-yellow-100';
  return 'text-red-700 bg-red-50';
};

const policyTooltip = (policy: NormalizedPolicies) => {
  const indicatorClasses = 'rounded inline-block w-2 h-2 mr-1';
  const indicator = (additionalClassName: string) => (
    `<span class="${indicatorClasses} ${additionalClassName}"> </span>`
  );
  const optionalTag = (key: keyof typeof policy) => (
    policy[key].isOptional
      ? '(optional)'
      : ''
  );
  return `
    <strong>Branch policies</strong>
    <ul class="w-72">
      <li>
        ${indicator(policyColorClass(policy, 'minimumNumberOfReviewers'))}
        Minimum number of reviewers ${policy.minimumNumberOfReviewers.count === 0 ? '' : `(${policy.minimumNumberOfReviewers.count})`}
        ${optionalTag('minimumNumberOfReviewers')}
      </li>
      <li>
        ${indicator(policyColorClass(policy, 'builds'))}
        Runs builds
        ${optionalTag('builds')}
      </li>
      <li>
        ${indicator(policyColorClass(policy, 'workItemLinking'))}
        Requires links to work items
        ${optionalTag('workItemLinking')}
      </li>
      <li>
        ${indicator(policyColorClass(policy, 'commentRequirements'))}
        Requires comment resolution
        ${optionalTag('commentRequirements')}
      </li>
      <li>
        ${indicator(policyColorClass(policy, 'requireMergeStrategy'))}
        Enforces merge strategy
        ${optionalTag('requireMergeStrategy')}
      </li>
    </ul>
  `;
};

type StageNameProps = {
  isSelected: boolean;
  label: string;
  count: string | number;
  onToggleSelect: () => void;
  isLast: boolean;
  selectedStage: RelevantPipelineStage | null;
};

const Artefacts: React.FC<{
  pipeline: TPipeline;
  policyForBranch: (repoId: string, branch: string) => NormalizedPolicies;
  ignoreStagesBefore?: string;
}> = ({ pipeline, policyForBranch, ignoreStagesBefore }) => (
  <div className="my-4">
    <div className="uppercase font-semibold text-sm text-gray-800 tracking-wide mb-2">Artifacts from repos</div>
    {Object.keys(pipeline.repos).length ? (
      <ol className="grid grid-flow-col justify-start">
        {Object.entries(pipeline.repos).map(([repoId, { name, branches, additionalBranches }]) => (
          <div
            className="bg-gray-100 pt-3 pb-3 px-4 rounded mb-2 self-start mr-3 artifact"
            key={repoId}
          >
            <Link
              to={`repos?search="${name}"`}
              className="font-semibold flex items-center mb-1 text-blue-600 artifact-title"
            >
              {name}
            </Link>
            {branches.length ? (
              <ol className="flex flex-wrap">
                {branches.map(branch => {
                  const policy = policyForBranch(repoId, branch);
                  const policyClassName = aggregatePolicyColorClass(policy);

                  return (
                    <li key={branch} className="mr-1 mb-1 px-2 border-2 rounded-md bg-white flex items-center text-sm">
                      <Branches className="h-4 mr-1" />
                      {branch.replace('refs/heads/', '')}
                      <span
                        className={`text-xs border-2 rounded-full px-2 inline-block m-2 ${policyClassName}`}
                        data-tip={policyTooltip(policy)}
                        data-html
                      >
                        Policies
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="text-sm mb-2">
                {`No branches went beyond ${ignoreStagesBefore}.`}
              </div>
            )}
            {additionalBranches?.length && (
              <details>
                <summary className="text-gray-500 text-xs pl-1 mt-1 cursor-pointer">
                  {`${additionalBranches.length} additional ${
                    additionalBranches.length === 1 ? 'branch' : 'branches'
                  } that didn't go beyond ${ignoreStagesBefore}`}
                </summary>
                <ol className="flex flex-wrap mt-2">
                  {additionalBranches.map(branch => {
                    const policy = policyForBranch(repoId, branch);
                    const policyClassName = aggregatePolicyColorClass(policy);

                    return (
                      <li key={branch} className="mr-1 mb-1 px-2 border-2 rounded-md bg-white flex items-center text-sm">
                        <Branches className="h-4 mr-1" />
                        {branch.replace('refs/heads/', '')}
                        <span
                          className={`text-xs border-2 rounded-full px-2 inline-block m-2 ${policyClassName}`}
                          data-tip={policyTooltip(policy)}
                          data-html
                        >
                          Policies
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </details>
            )}
          </div>
        ))}
      </ol>
    ) : (
      <div className="inline-flex bg-gray-100 py-3 px-4 rounded-lg">
        <AlertMessage
          message="No starting artifact found"
          type="info"
        />
      </div>
    )}
  </div>
);

const StageName: React.FC<StageNameProps> = ({
  isSelected, onToggleSelect, count, label, selectedStage, isLast
}) => {
  const onClick = useCallback(e => {
    e.stopPropagation();
    onToggleSelect();
  }, [onToggleSelect]);

  return (
    <div className={`flex items-center mt-4 ${isSelected ? 'w-full' : ''}`}>
      <div className={`py-1 px-4 mr-2 transition-width duration-300 ease-in-out
        ${isSelected ? 'bg-gray-100 border-transparent w-full' : 'border rounded hover:bg-gray-100'}`}
      >
        <button
          className={`text-gray-900 break-words rounded-t-lg flex
            hover:text-gray-900 focus:text-gray-900 cursor-pointer
            ${isSelected ? 'items-baseline' : 'items-center'}
            ${isSelected ? 'mt-1' : ''}
            `}
          onClick={onClick}
        >
          <div className={`mr-2  font-semibold ${isSelected ? 'text-black text-2xl' : 'text-gray-600 text-lg'} `}>
            {typeof count === 'number' ? num(count) : count}
          </div>
          <div className={`uppercase text-xs ${
            isSelected ? 'font-bold text-base text-black tracking-wide' : 'text-gray-600 tracking-wider'
          }`}
          >
            {label}
          </div>
        </button>

        <div role="region">
          {selectedStage && isSelected ? (
            <div className="grid grid-cols-5 mt-1 mb-3 rounded-lg bg-gray-100 w-full">
              <Metric name="Releases" value={selectedStage.total} position="first" />
              <Metric name="Successful" value={selectedStage.successful} />
              <Metric name="Failed" value={selectedStage.total - selectedStage.successful} />
              <Metric
                name="Per week"
                value={selectedStage.successful === 0 ? '0' : (selectedStage.total / 4).toFixed(2)}
              />
              <Metric
                name="Success rate"
                value={(selectedStage.successful === 0
                  ? '0%'
                  : `${((selectedStage.successful * 100) / selectedStage.total).toFixed(2)}%`
                )}
                position="last"
              />
            </div>
          ) : null}
        </div>
      </div>
      {!isLast ? <ArrowRight className="h-4 mr-2 text-gray-600 " /> : null}
    </div>
  );
};

const Pipeline: React.FC<{
  pipeline: TPipeline;
  stagesToHighlight?: string[];
  ignoreStagesBefore?: string;
  policyForBranch: (repoId: string, branch: string) => NormalizedPolicies;
}> = ({
  pipeline, stagesToHighlight, policyForBranch, ignoreStagesBefore
}) => {
  const [selectedStage, setSelectedStage] = useState<RelevantPipelineStage | null>(null);

  return (
    <Card
      key={pipeline.name}
      title={pipeline.name}
      titleUrl={pipeline.url}
      isExpanded={selectedStage !== null}
      onCardClick={() => setSelectedStage(!selectedStage ? pipeline.relevantStages[0] : null)}
      subtitle={(
        <>
          {stagesToHighlight?.map(stageToHighlight => {
            const doesStageExist = pipelineHasStageNamed(stageToHighlight)(pipeline);
            const isStageUsed = pipelineUsesStageNamed(stageToHighlight)(pipeline);

            return (
              <Flair
                key={stageToHighlight}
                // eslint-disable-next-line no-nested-ternary
                colorClassName={doesStageExist && isStageUsed ? 'bg-green-600' : doesStageExist ? 'bg-yellow-400' : 'bg-gray-400'}
                label={`${stageToHighlight}: ${doesStageExist ? `${isStageUsed ? 'Used' : 'Unused'}` : "Doesn't exist"}`}
              />
            );
          })}
        </>
      )}
    >
      <div className="px-6">
        <Artefacts
          pipeline={pipeline}
          policyForBranch={policyForBranch}
          ignoreStagesBefore={ignoreStagesBefore}
        />
        <div className="uppercase font-semibold text-sm text-gray-800 tracking-wide mt-6">
          Relevant stages
        </div>
        <div className="flex flex-wrap">
          {pipeline.relevantStages.map((stage, index) => (
            <StageName
              key={stage.name}
              count={stage.successful}
              label={stage.name}
              isSelected={selectedStage === stage}
              onToggleSelect={() => setSelectedStage(selectedStage === stage ? null : stage)}
              isLast={index === pipeline.relevantStages.length - 1}
              selectedStage={selectedStage}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

export default Pipeline;
