import React, { Fragment } from 'react';
import type { ReleasePipelineStats } from '../../shared/types';
import { num } from '../helpers/utils';
import { pipelineDeploysExclusivelyFromMaster, pipelineHasStageNamed, pipelineUsesStageNamed } from './pipeline-utils';
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
          topStats={[
            {
              title: `${stageName}: Exists`,
              value: num(
                pipelines.reduce((acc, pipeline) => (
                  pipelineHasStageNamed(stageName)(pipeline) ? acc + 1 : acc
                ), 0)
              ),
              tooltip: `Release pipelines that have a stage named (or containing) ${stageName}.`
            }
          ]}

        />
        <ProjectStat
          topStats={[{
            title: `${stageName}: Exists and used`,
            value: num(
              pipelines.reduce((acc, pipeline) => (
                pipelineUsesStageNamed(stageName)(pipeline) ? acc + 1 : acc
              ), 0)
            ),
            tooltip: `Release pipelines that have a successful deployment from ${stageName}.`
          }]}
        />
      </Fragment>
    ))}
    <ProjectStat
      topStats={[{
        title: 'Deployments from master',
        value: num(pipelines.reduce((acc, pipeline) => (
          pipelineDeploysExclusivelyFromMaster(pipeline) ? acc + 1 : acc
        ), 0)),
        tooltip: 'Release pipelines that deploy exclusively from master.'
      }]}
    />
  </ProjectStats>
);

export default ReleasePipelineSummary;

