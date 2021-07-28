import React from 'react';
import { ProjectReleaseAnalysis, ReleaseStats } from '../../shared/types';
import AlertMessage from '../components/AlertMessage';
import Card from '../components/ExpandingCard';
import Flair from '../components/Flair';
import { Branches } from '../components/Icons';
import Stage from '../components/Stage';

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
  if (!releaseAnalysis.releases) return <AlertMessage message="No release pipelines found" />;

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
            preTabs={Object.keys(release.repos).length ? (
              <div className="my-4">
                <div className="uppercase font-semibold text-sm text-gray-800 tracking-wide mb-2">Artifacts</div>
                <ol className="grid grid-flow-col auto-cols-max">
                  {Object.entries(release.repos).map(([repoName, branches]) => (
                    <li className="bg-gray-100 pt-3 pb-4 px-4 rounded mb-2 self-start mr-3">
                      <div className="font-semibold flex items-center mb-1">
                        {/* <GitRepo className="h-4 mr-1" /> */}
                        {repoName}
                      </div>
                      <ol className="flex flex-wrap">
                        {branches.map(branch => (
                          <li className="mr-1 px-2 border-2 rounded-md bg-white flex items-center text-sm">
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
            subtitle={(
              <>
                {Object.entries(release.repos).length === 0 ? (
                  <Flair
                    colorClassName="bg-gray-400"
                    label={Object.entries(release.repos).length > 0
                      ? 'Starts with artifact'
                      : 'No starting artifact'}
                  />
                ) : null}
                {highlightExistanceOfStages.map(stage => (
                  <Flair
                    // eslint-disable-next-line no-nested-ternary
                    colorClassName={stage.exists && stage.usesStage ? 'bg-green-600' : stage.exists ? 'bg-yellow-400' : 'bg-gray-400'}
                    label={
                      `${stage.stageName}: ${stage.exists ? `Exists, ${stage.usesStage ? 'and used' : 'but unused'}` : "Doesn't exist"}`
                    }
                  />
                ))}
              </>
            )}
            tabs={release.stages.map(stage => ({
              title: stage.name,
              count: stage.successCount,
              content: (
                <div className="grid grid-cols-5 p-6 py-6 rounded-lg bg-gray-100">
                  <Stage name="Releases" value={stage.releaseCount} position="first" />
                  <Stage name="Successful releases" value={stage.successCount} />
                  <Stage name="Successful releases" value={stage.successCount} />
                  <Stage name="Releases per week" value={stage.successCount === 0 ? '0' : (stage.releaseCount / 4).toFixed(2)} />
                  <Stage
                    name="Success rate"
                    value={(stage.successCount === 0 ? '0%' : `${((stage.successCount * 100) / stage.releaseCount).toFixed(2)}%`)}
                    position="last"
                  />
                </div>
              )
            }))}
          />
        );
      }) : <AlertMessage message="No release pipelines found" />}
    </>
  );
};

export default Releases;
