import React, { Fragment, useCallback } from 'react';
import { num } from '../helpers/utils.js';
import ProjectStat from './ProjectStat.jsx';
import ProjectStats from './ProjectStats.jsx';
import { divide, toPercentage } from '../../shared/utils.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import { trpc } from '../helpers/trpc.js';
import useReleaseFilters from '../hooks/use-release-filters.js';
import Loading from './Loading.jsx';

const ReleasePipelineSummary2: React.FC = () => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const filters = useReleaseFilters();
  const { data: summary } = trpc.releases.summary.useQuery(filters);

  const showReleasePipelineUsage = useCallback(() => (
    <div className="w-96">
      {/* <UsageByEnv
        perEnvUsage={perEnvUsage}
        pipelineCount={pipelines.length}
        queryPeriodDays={queryPeriodDays}
      /> */}
      Coming soon
    </div>
  ), []);

  if (!summary) return <Loading />;

  return (
    <ProjectStats>
      {summary.lastEnv && (
        <ProjectStat
          topStats={[{
            title: `${summary.lastEnv.envName} deploys`,
            value: (
              <>
                {num(Math.round(summary.lastEnv.deploys / queryPeriodDays))}
                <span className="font-normal text-sm"> / day</span>
              </>
            )
          }]}
          childStats={[{
            title: 'Success',
            value: divide(summary.lastEnv.successful, summary.lastEnv.deploys)
              .map(toPercentage)
              .getOr('-')
          }]}
          onClick={{
            open: 'popup',
            contents: showReleasePipelineUsage
          }}
        />
      )}
      <ProjectStat
        topStats={[{
          title: 'Starts with artifact',
          value: divide(
            summary.startsWithArtifact,
            summary.pipelineCount
          ).map(toPercentage).getOr('-')
        }]}
      />
      {(summary.stagesToHighlight || []).map(stage => (
        <Fragment key={stage.name}>
          <ProjectStat
            topStats={[
              {
                title: `${stage.name}: exists`,
                value: divide(stage.exists, summary.pipelineCount).map(toPercentage).getOr('-'),
                tooltip: `${num(stage.exists)} out of ${summary.pipelineCount} release ${
                  stage.exists === 1 ? 'pipeline has' : 'pipelines have'
                } a stage named (or containing) ${stage}.`
              },
              {
                title: `${stage.name}: used`,
                value: divide(stage.used, summary.pipelineCount).map(toPercentage).getOr('-'),
                tooltip: `${num(stage.used)} out of ${summary.pipelineCount} release ${
                  stage.used === 1 ? 'pipeline has' : 'pipelines have'
                } a successful deployment from ${stage}.`
              }
            ]}
          />
        </Fragment>
      ))}
      <ProjectStat
        topStats={[{
          title: 'Master-only releases',
          value: (
            divide(summary.masterOnly, summary.runCount).map(toPercentage).getOr('-')
            // <LabelWithSparkline
            //   label={divide(summary.masterOnly, summary.runCount).map(toPercentage).getOr('-')}
            //   data={masterReleasesByWeek}
            //   yAxisLabel={x => `${x}%`}
            //   lineColor={increaseIsBetter(masterReleasesByWeek.filter(exists))}
            //   renderer={pathRendererSkippingUndefineds}
            // />
          ),
          tooltip: `${num(summary.masterOnly)} out of ${num(summary.pipelineCount)} releases were exclusively from master.${
            summary.ignoredStagesBefore ? `<br />Branches that didn't go to ${summary.ignoredStagesBefore} are not considered.` : ''
          }`
        }]}
      />
      <ProjectStat
        topStats={[{
          title: 'Conforms to branch policies',
          value: 'todo'
          // tooltip: `${num(policyPassCount)} out of ${num(pipelines.length)} have branches that conform to the branch policy.${
          //   ignoreStagesBefore ? `<br />Branches that didn't go to ${ignoreStagesBefore} are not considered.` : ''
          // }`
        }]}
      />
    </ProjectStats>
  );
};

export default ReleasePipelineSummary2;
