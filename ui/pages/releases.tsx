import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ReleaseStats } from '../../shared/types';
import { fetchProjectReleaseMetrics } from '../network';

const Release: React.FC<{ release: ReleaseStats }> = ({ release }) => (
  <div className="py-10">
    <h1 className="text-3xl">{release.name}</h1>
    <table width="100%">
      <thead>
        <tr className="font-bold bg-gray-200">
          <td>Stage name</td>
          <td>Last release date</td>
          <td>Number of releases</td>
          <td>Release frequency</td>
          <td>Successful releases</td>
          <td>Success rate</td>
        </tr>
      </thead>
      <tbody>
        {release.stages.map(stage => (
          <tr key={stage.id}>
            <td>{stage.name}</td>
            <td>{new Date(stage.lastReleaseDate).getTime() === 0 ? 'never' : stage.lastReleaseDate}</td>
            <td>
              {stage.releaseCount}
              {' '}
              releases
            </td>
            <td>
              {stage.releaseCount / 4}
              {' '}
              releases/week
            </td>
            <td>
              {stage.successCount}
              {' '}
              releases
            </td>
            <td>
              {stage.successCount === 0 ? '0' : ((stage.successCount * 100) / stage.releaseCount)}
              %
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Project: React.FC = () => {
  const [releaseAnalysis, setReleaseAnalysis] = useState<ReleaseStats[] | undefined>();
  const { collection, project } = useParams<{ collection: string, project: string }>();

  useEffect(() => {
    fetchProjectReleaseMetrics(collection, project).then(setReleaseAnalysis);
  }, [collection, project]);

  if (!releaseAnalysis) return <div>Loading...</div>;

  return (
    <>
      {releaseAnalysis.length ? releaseAnalysis.map(release => (
        <Release release={release} key={release.id} />
      )) : 'No Results'}
    </>
  );
};

export default Project;
