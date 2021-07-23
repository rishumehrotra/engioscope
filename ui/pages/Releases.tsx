import React from 'react';
import { ProjectReleaseAnalysis, ReleaseStats } from '../../shared/types';
import Card from '../components/ExpandingCard';
import Metric from '../components/Metric';

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

const Releases: React.FC<ReleasesProps> = ({ releaseAnalysis, search }: ReleasesProps) => {
  if (!releaseAnalysis) return <div>Loading...</div>;

  const pipelines = releaseAnalysis.releases.filter(bySearchTerm(search || ''));

  return (
    <>
      {pipelines.length ? pipelines.map((release, index) => {
        const highlightExistanceOfStages: StagesToHighlight[] = releaseAnalysis.stagesToHighlight
          ? releaseAnalysis.stagesToHighlight.map(stageToHighlight => {
            const matchingStage = release.stages.find(
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
            key={`${release.name}-${index}`}
            title={release.name}
            titleUrl={release.url}
            subtitle={(
              <>
                <span className="rounded-full bg-gray-200 px-3 py-1 text-sm mr-2">
                  <span className={
                    `rounded-full w-3 h-3 inline-block mr-2
                      ${Object.entries(release.repos).length > 0 ? 'bg-green-600' : 'bg-gray-400'}`
                  }
                  >
                    {' '}
                  </span>
                  {
                    Object.entries(release.repos).length > 0
                      ? 'Starts with artifact'
                      : 'No starting artifact'
                  }
                </span>
                {highlightExistanceOfStages.map(stage => (
                  <span key={stage.stageName} className="rounded-full bg-gray-200 px-3 py-1 text-sm">
                    <span className={
                      `rounded-full w-3 h-3 inline-block mr-2
                      ${stage.exists && stage.usesStage ? 'bg-green-600' : stage.exists ? 'bg-yellow-400' : 'bg-gray-400'}`
                    }
                    >
                      {' '}
                    </span>
                    {stage.stageName}
                    :
                    {' '}
                    {stage.exists ? `Exists, ${stage.usesStage ? 'and used' : 'but unused'}` : "Doesn't exist"}
                  </span>
                ))}
              </>
            )}
            tabs={release.stages.map(stage => ({
              title: stage.name,
              count: stage.successCount,
              content: (
                <div className="grid grid-cols-6 gap-4 p-6 py-6 rounded-lg bg-gray-100">
                  <Metric name="Releases" value={stage.releaseCount} />
                  <Metric name="Successful releases" value={stage.successCount} />
                  <Metric name="Successful releases" value={stage.successCount} />
                  <Metric name="Releases per week" value={stage.successCount === 0 ? '0' : (stage.releaseCount / 4).toFixed(2)} />
                  <Metric
                    name="Success rate"
                    value={(stage.successCount === 0 ? '0%' : `${((stage.successCount * 100) / stage.releaseCount).toFixed(2)}%`)}
                  />
                </div>
              )
            }))}
          />
        );
      }) : 'No Releases'}
    </>
  );
};

export default Releases;
