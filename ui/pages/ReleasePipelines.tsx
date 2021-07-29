import React, { useCallback, useState } from 'react';
import { ProjectReleaseAnalysis, ReleaseStats } from '../../shared/types';
import AlertMessage from '../components/AlertMessage';
import Card from '../components/ExpandingCard';
import Flair from '../components/Flair';
import { ArrowRight, Branches } from '../components/Icons';
import Metric from '../components/Metric';
import { num } from '../helpers';

type ReleasesProps = {
  releaseAnalysis: ProjectReleaseAnalysis | undefined;
  search: string | undefined;
}

type StagesToHighlight = {
  stageName: string;
  exists: boolean;
  usesStage: boolean;
}

const bySearchTerm = (searchTerm: string) => (pipeline: ReleaseStats) => (
  pipeline.name.toLowerCase().includes(searchTerm.toLowerCase())
);

type StageNameProps = {
  isSelected: boolean;
  label: string;
  count: string | number;
  onToggleSelect: () => void;
  isLast: boolean;
  selectedStage: ReleaseStats['stages'][number] | null;
};

const Artefacts: React.FC<{pipeline:ReleaseStats}> = ({ pipeline }) => (
  <div className="my-4">
    <div className="uppercase font-semibold text-sm text-gray-800 tracking-wide mb-2">Artifacts</div>
    {Object.keys(pipeline.repos).length ? (
      <ol className="grid grid-flow-col justify-start">
        {Object.entries(pipeline.repos).map(([repoName, branches]) => (
          <li key={repoName} className="bg-gray-100 pt-3 pb-4 px-4 rounded mb-2 self-start mr-3">
            <div className="font-semibold flex items-center mb-1">
              {repoName}
            </div>
            <ol className="flex flex-wrap">
              {branches.map(branch => (
                <li key={branch} className="mr-1 px-2 border-2 rounded-md bg-white flex items-center text-sm">
                  <Branches className="h-4 mr-1" />
                  {branch.replace('refs/heads/', '')}
                </li>
              ))}
            </ol>
          </li>
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
    <div className={`flex items-center mt-2 ${isSelected ? 'w-full' : ''}`}>
      <div className={`py-1 px-4 mr-2
        ${isSelected ? 'w-full' : ''}
        ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-100'}
        ${isSelected ? 'rounded-lg' : 'border rounded'}
        `}
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

const Pipeline: React.FC<{ pipeline: ReleaseStats; stagesToHighlight?: string[]}> = ({ pipeline, stagesToHighlight }) => {
  const [selectedStage, setSelectedStage] = useState<ReleaseStats['stages'][number] | null>(null);

  const highlightExistanceOfStages: StagesToHighlight[] = stagesToHighlight
    ? stagesToHighlight.map(stageToHighlight => {
      const matchingStage = pipeline.stages.find(
        stage => stage.name.toLowerCase().includes(stageToHighlight.toLowerCase())
      );

      return {
        stageName: stageToHighlight,
        exists: !!matchingStage,
        usesStage: (matchingStage?.releaseCount || 0) > 0
      };
    })
    : [];

  return (
    <Card
      key={pipeline.name}
      title={pipeline.name}
      titleUrl={pipeline.url}
      isExpanded={selectedStage !== null}
      onCardClick={() => setSelectedStage(!selectedStage ? pipeline.stages[0] : null)}
      subtitle={(
        <>
          {highlightExistanceOfStages.map(stage => (
            <Flair
              key={stage.stageName}
              // eslint-disable-next-line no-nested-ternary
              colorClassName={stage.exists && stage.usesStage ? 'bg-green-600' : stage.exists ? 'bg-yellow-400' : 'bg-gray-400'}
              label={`${stage.stageName}: ${stage.exists ? `Exists, ${stage.usesStage ? 'and used' : 'but unused'}` : "Doesn't exist"}`}
            />
          ))}
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

const Releases: React.FC<ReleasesProps> = ({ releaseAnalysis, search }: ReleasesProps) => {
  if (!releaseAnalysis) return <div>Loading...</div>;
  if (!releaseAnalysis.releases) return <AlertMessage message="No release pipelines found" />;

  const pipelines = releaseAnalysis.releases.filter(bySearchTerm(search || ''));

  return (
    <>
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

export default Releases;

