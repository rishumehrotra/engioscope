import React, { useCallback, useState } from 'react';
import { ProjectReleaseAnalysis, ReleaseStats } from '../../shared/types';
import AlertMessage from '../components/AlertMessage';
import Card from '../components/ExpandingCard';
import Flair from '../components/Flair';
import { Branches } from '../components/Icons';
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
}

const StageName: React.FC<StageNameProps> = ({
  isSelected, onToggleSelect, count, label
}) => {
  const onClick = useCallback(e => {
    e.stopPropagation();
    onToggleSelect();
  }, [onToggleSelect]);

  return (
    <button
      className={`pt-2 pb-4 px-6 mt-2 text-gray-900 break-words rounded-t-lg
        ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-100'}
        hover:text-gray-900 focus:text-gray-900 cursor-pointer`}
      onClick={onClick}
    >
      <div>
        <div className={`text-3xl font-semibold -mb-1 ${isSelected ? 'text-black' : 'text-gray-600'} `}>
          {typeof count === 'number' ? num(count) : count}
        </div>
        <div className="uppercase text-xs tracking-wider text-gray-600 mt-2">{label}</div>
      </div>
    </button>
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
    // eslint-disable-next-line react/no-array-index-key
      key={pipeline.name}
      title={pipeline.name}
      titleUrl={pipeline.url}
      isExpanded={false}
      onCardClick={() => setSelectedStage(!selectedStage ? pipeline.stages[0] : null)}
      subtitle={(
        <>
          {Object.entries(pipeline.repos).length === 0 ? (
            <Flair
              colorClassName="bg-gray-400"
              label={Object.entries(pipeline.repos).length > 0
                ? 'Starts with artifact'
                : 'No starting artifact'}
            />
          ) : null}
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
      <>
        {Object.keys(pipeline.repos).length ? (
          <div className="my-4">
            <div className="uppercase font-semibold text-sm text-gray-800 tracking-wide mb-2">Artifacts</div>
            <ol className="grid grid-flow-col auto-cols-max">
              {Object.entries(pipeline.repos).map(([repoName, branches]) => (
                <li key={repoName} className="bg-gray-100 pt-3 pb-4 px-4 rounded mb-2 self-start mr-3">
                  <div className="font-semibold flex items-center mb-1">
                    {/* <GitRepo className="h-4 mr-1" /> */}
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
          </div>
        ) : undefined}
        {pipeline.stages.map(stage => (
          <StageName
            key={stage.name}
            count={stage.successCount}
            label={stage.name}
            isSelected={false}
            onToggleSelect={() => setSelectedStage(selectedStage === stage ? null : stage)}
          />
        ))}
        <span role="region">
          {selectedStage ? (
            <div className="grid grid-cols-5 p-6 py-6 rounded-lg bg-gray-100">
              <Metric name="Releases" value={selectedStage.releaseCount} position="first" />
              <Metric name="Successful releases" value={selectedStage.successCount} />
              <Metric name="Successful releases" value={selectedStage.successCount} />
              <Metric
                name="Releases per week"
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

        </span>
      </>
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
