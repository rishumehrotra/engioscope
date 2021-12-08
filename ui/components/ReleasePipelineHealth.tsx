import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { BranchPolicy, PipelineStageStats, ReleasePipelineStats } from '../../shared/types';
import { num } from '../helpers/utils';
import AlertMessage from './common/AlertMessage';
import Card from './common/ExpandingCard';
import Flair from './common/Flair';
import { ArrowRight, Branches } from './common/Icons';
import Metric from './Metric';
import { pipelineHasStageNamed, pipelineUsesStageNamed } from './pipeline-utils';

const aggregatePolicies = (policies: BranchPolicy[]) => (
  policies.reduce(
    (acc, policy) => {
      if (policy.type === 'minimumNumberOfReviewers') {
        acc.numberOfReviewers.value = policy.minimumApproverCount;
        acc.numberOfReviewers.isOptional = policy.isOptional;
      } else if (policy.type === 'workItemLinking') {
        acc.workItemLinking.state = true;
        acc.workItemLinking.isOptional = policy.isOptional;
      } else if (policy.type === 'builds') {
        acc.builds.state = true;
        acc.builds.isOptional = policy.isOptional;
      } else if (policy.type === 'commentRequirements') {
        acc.commentRequirements.state = true;
        acc.commentRequirements.isOptional = policy.isOptional;
      } else if (policy.type === 'requireMergeStrategy') {
        acc.requireMergeStrategy.state = true;
        acc.requireMergeStrategy.isOptional = policy.isOptional;
      }
      return acc;
    },
    {
      numberOfReviewers: { value: 0, isOptional: false },
      workItemLinking: { state: false, isOptional: false },
      builds: { state: false, isOptional: false },
      commentRequirements: { state: false, isOptional: false },
      requireMergeStrategy: { state: false, isOptional: false }
    }
  )
);

const policyColorClass = (aggregatedPolicy: ReturnType<typeof aggregatePolicies>, key: keyof ReturnType<typeof aggregatePolicies>) => {
  if (key === 'numberOfReviewers') {
    if (aggregatedPolicy.numberOfReviewers.value === 0) return 'bg-red-500';
    if (aggregatedPolicy.numberOfReviewers.isOptional
      || aggregatedPolicy.numberOfReviewers.value < 2
    ) {
      return 'bg-yellow-500';
    }
    if (
      aggregatedPolicy.numberOfReviewers.value >= 2
      && !aggregatedPolicy.numberOfReviewers.isOptional
    ) {
      return 'bg-green-500';
    }
    return 'bg-red-500';
  }
  if (aggregatedPolicy[key].isOptional && aggregatedPolicy[key].state) {
    return 'bg-yellow-500';
  }
  if (!aggregatedPolicy[key].isOptional && aggregatedPolicy[key].state) {
    return 'bg-green-500';
  }
  return 'bg-red-500';
};

const aggregatePolicyColorClass = (aggregatedPolicy: ReturnType<typeof aggregatePolicies>) => {
  const classes = Object.keys(aggregatedPolicy).map(
    key => policyColorClass(aggregatedPolicy, key as keyof ReturnType<typeof aggregatePolicies>)
  );
  if (classes.every(c => c === 'bg-green-500')) {
    return 'text-green-700 bg-green-50';
  }
  if (classes.some(c => c === 'bg-red-500')) {
    return 'text-red-700 bg-red-50';
  }
  return 'text-yellow-700 bg-yellow-100';
};

const policyTooltip = (aggregatedPolicy: ReturnType<typeof aggregatePolicies>) => {
  const indicatorClasses = 'rounded inline-block w-2 h-2 mr-1';
  const indicator = (additionalClassName: string) => (
    `<span class="${indicatorClasses} ${additionalClassName}"> </span>`
  );
  const optionalTag = (key: keyof typeof aggregatedPolicy) => (
    aggregatedPolicy[key].isOptional
      ? '(optional)'
      : ''
  );
  return `
    <strong>Branch policies</strong>
    <ul class="w-72">
      <li>
        ${indicator(policyColorClass(aggregatedPolicy, 'numberOfReviewers'))}
        Minimum number of reviewers ${aggregatedPolicy.numberOfReviewers.value === 0 ? '' : `(${aggregatedPolicy.numberOfReviewers.value})`}
        ${optionalTag('numberOfReviewers')}
      </li>
      <li>
        ${indicator(policyColorClass(aggregatedPolicy, 'builds'))}
        Runs builds
        ${optionalTag('builds')}
      </li>
      <li>
        ${indicator(policyColorClass(aggregatedPolicy, 'workItemLinking'))}
        Requires links to work items
        ${optionalTag('workItemLinking')}
      </li>
      <li>
        ${indicator(policyColorClass(aggregatedPolicy, 'commentRequirements'))}
        Requires comment resolution
        ${optionalTag('commentRequirements')}
      </li>
      <li>
        ${indicator(policyColorClass(aggregatedPolicy, 'requireMergeStrategy'))}
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
  selectedStage: PipelineStageStats | null;
};

const Artefacts: React.FC<{pipeline: ReleasePipelineStats}> = ({ pipeline }) => {
  const history = useHistory();
  const goToRepo = useCallback((repoName: string) => {
    history.push(history.location.pathname.replace('/release-pipelines', `/repos?search="${repoName}"`));
  }, [history]);

  return (
    <div className="my-4">
      <div className="uppercase font-semibold text-sm text-gray-800 tracking-wide mb-2">Artifacts from repos</div>
      {Object.keys(pipeline.repos).length ? (
        <ol className="grid grid-flow-col justify-start">
          {Object.entries(pipeline.repos).map(([repoName, branches]) => (
            <button
              onClick={() => goToRepo(repoName)}
              key={repoName}
              className="bg-gray-100 pt-3 pb-3 px-4 rounded mb-2 self-start mr-3 artifact"
            >
              <div className="font-semibold flex items-center mb-1 text-blue-600 artifact-title">
                {repoName}
              </div>
              <ol className="flex flex-wrap">
                {branches.map(({ branch, policies }) => {
                  const aggregatedPolicy = aggregatePolicies(policies);
                  const policyClassName = aggregatePolicyColorClass(aggregatedPolicy);

                  return (
                    <li key={branch} className="mr-1 mb-1 px-2 border-2 rounded-md bg-white flex items-center text-sm">
                      <Branches className="h-4 mr-1" />
                      {branch.replace('refs/heads/', '')}
                      <span
                        className={`text-xs border-2 rounded-full px-2 inline-block m-2 ${policyClassName}`}
                        data-tip={policyTooltip(aggregatedPolicy)}
                        data-html
                      >
                        Policies
                      </span>
                    </li>
                  );
                })}
              </ol>
            </button>
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
};

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
          <div className={`uppercase text-xs
        ${isSelected ? 'font-bold text-base text-black tracking-wide' : 'text-gray-600 tracking-wider'}`}
          >
            {label}
          </div>
        </button>

        <div role="region">
          {selectedStage && isSelected ? (
            <div className="grid grid-cols-5 mt-1 mb-3 rounded-lg bg-gray-100 w-full">
              <Metric name="Releases" value={selectedStage.releaseCount} position="first" />
              <Metric name="Successful" value={selectedStage.successCount} />
              <Metric name="Failed" value={selectedStage.releaseCount - selectedStage.successCount} />
              <Metric
                name="Per week"
                value={selectedStage.successCount === 0 ? '0' : (selectedStage.releaseCount / 4).toFixed(2)}
              />
              <Metric
                name="Success rate"
                value={(selectedStage.successCount === 0
                  ? '0%'
                  : `${((selectedStage.successCount * 100) / selectedStage.releaseCount).toFixed(2)}%`
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

const Pipeline: React.FC<{ pipeline: ReleasePipelineStats; stagesToHighlight?: string[]}> = ({ pipeline, stagesToHighlight }) => {
  const [selectedStage, setSelectedStage] = useState<PipelineStageStats | null>(null);

  return (
    <Card
      key={pipeline.name}
      title={pipeline.name}
      titleUrl={pipeline.url}
      isExpanded={selectedStage !== null}
      onCardClick={() => setSelectedStage(!selectedStage ? pipeline.stages[0] : null)}
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
                label={`${stageToHighlight}: ${doesStageExist ? `Exists, ${isStageUsed ? 'and used' : 'but unused'}` : "Doesn't exist"}`}
              />
            );
          })}
        </>
      )}
    >
      <div className="px-6">
        <Artefacts pipeline={pipeline} />
        <div className="uppercase font-semibold text-sm text-gray-800 tracking-wide mt-6">Successful releases per stage</div>
        <div className="flex flex-wrap">
          {pipeline.stages.map((stage, index) => (
            <StageName
              key={stage.name}
              count={stage.successCount}
              label={stage.name}
              isSelected={selectedStage === stage}
              onToggleSelect={() => setSelectedStage(selectedStage === stage ? null : stage)}
              isLast={index === pipeline.stages.length - 1}
              selectedStage={selectedStage}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

export default Pipeline;
