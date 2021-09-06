import React, { Fragment } from 'react';
import type { ReleasePipelineStats } from '../../shared/types';
import { num } from '../helpers/utils';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';

type ReleasePipelineSummaryProps = {
  pipelines: ReleasePipelineStats[];
  stagesToHighlight?: string[];
};

const ReleasePipelineSummary: React.FC<ReleasePipelineSummaryProps> = ({ pipelines, stagesToHighlight }) => (
  <ProjectStats>
    {(stagesToHighlight || []).map(stageName => (
      <Fragment key={stageName}>
        <ProjectStat
          title={`${stageName}: Exists`}
          value={num(
            pipelines.reduce((acc, pipeline) => {
              const matchingStage = pipeline.stages
                .find(stage => stage.name.toLowerCase().includes(stageName.toLowerCase()));

              return acc + (matchingStage ? 1 : 0);
            }, 0)
          )}
          tooltip={`Release pipelines that have a stage named (or containing) ${stageName}.`}
        />
        <ProjectStat
          title={`${stageName}: Exists and used`}
          value={num(
            pipelines.reduce((acc, pipeline) => {
              const matchingStage = pipeline.stages
                .find(stage => stage.name.toLowerCase().includes(stageName.toLowerCase()));

              if (!matchingStage) return acc;
              return acc + (matchingStage.successCount ? 1 : 0);
            }, 0)
          )}
          tooltip={`Release pipelines that have a successful deployment from ${stageName}.`}
        />
      </Fragment>
    ))}
    <ProjectStat
      title="Deployments from master"
      value={num(pipelines.reduce((acc, pipeline) => (
        acc + (
          Object.values(pipeline.repos)
            .every(repoBranches => repoBranches.length === 1 && repoBranches[0] === 'master')
            ? 1 : 0
        )
      ), 0))}
      tooltip="Release pipelines that deploy exclusively from master."
    />
  </ProjectStats>
);

export default ReleasePipelineSummary;

