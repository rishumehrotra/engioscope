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
    {(stagesToHighlight || []).map(stageName => {
      const hasStage = pipelineHasStageNamed(stageName);
      const usesStage = pipelineUsesStageNamed(stageName);

      return (
        <Fragment key={stageName}>
          <ProjectStat
            topStats={[
              {
                title: `${stageName}: Exists`,
                value: num(
                  pipelines.reduce(
                    (acc, pipeline) => acc + (hasStage(pipeline) ? 1 : 0),
                    0
                  )
                ),
                tooltip: `Release pipelines that have a stage named (or containing) ${stageName}.`
              }
            ]}
          />
          <ProjectStat
            topStats={[{
              title: `${stageName}: Exists and used`,
              value: num(
                pipelines.reduce(
                  (acc, pipeline) => acc + (usesStage(pipeline) ? 1 : 0),
                  0
                )
              ),
              tooltip: `Release pipelines that have a successful deployment from ${stageName}.`
            }]}
          />
        </Fragment>
      );
    })}
    <ProjectStat
      topStats={[{
        title: 'Deployments from master',
        value: num(
          pipelines.reduce(
            (acc, pipeline) => acc + (pipelineDeploysExclusivelyFromMaster(pipeline) ? 1 : 0),
            0
          )
        ),
        tooltip: 'Release pipelines that deploy exclusively from master.'
      }]}
    />
  </ProjectStats>
);

export default ReleasePipelineSummary;

