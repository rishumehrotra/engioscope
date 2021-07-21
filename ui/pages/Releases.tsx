import React from 'react';
import { ReleaseStats } from '../../shared/types';
import Card from '../components/ExpandingCard';
import Metric from '../components/Metric';

type ReleasesProps = {
  releaseAnalysis: ReleaseStats[] | undefined;
  search: string | undefined;
}

const bySearchTerm = (searchTerm: string) => (pipeline: ReleaseStats) => (
  pipeline.name.toLowerCase().includes(searchTerm.toLowerCase())
);

const Releases: React.FC<ReleasesProps> = ({ releaseAnalysis, search }: ReleasesProps) => {
  if (!releaseAnalysis) return <div>Loading...</div>;

  const pipelines = releaseAnalysis.filter(bySearchTerm(search || ''));

  return (
    <>
      {pipelines.length ? pipelines.map((release, index) => (
        <Card
          // eslint-disable-next-line react/no-array-index-key
          key={`${release.name}-${index}`}
          title={release.name}
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
      )) : 'No Releases'}
    </>
  );
};

export default Releases;
