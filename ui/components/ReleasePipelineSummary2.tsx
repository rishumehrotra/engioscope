import React, { Fragment, useCallback } from 'react';
import { num, pluralise } from '../helpers/utils.js';
import ProjectStat from './ProjectStat.jsx';
import ProjectStats from './ProjectStats.jsx';
import { divide, toPercentage } from '../../shared/utils.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import { trpc } from '../helpers/trpc.js';
import useReleaseFilters from '../hooks/use-release-filters.js';
import UsageByEnv from './UsageByEnv.jsx';
import Loading from './Loading.jsx';

const UsageByEnvWrapper = () => {
  const filters = useReleaseFilters();
  const [queryPeriodDays] = useQueryPeriodDays();
  const { data: usageByEnv } = trpc.releases.usageByEnvironment.useQuery(filters);

  return (
    <div className="w-96">
      {usageByEnv ? (
        <UsageByEnv perEnvUsage={usageByEnv} queryPeriodDays={queryPeriodDays} />
      ) : (
        <Loading />
      )}
    </div>
  );
};

const ReleasePipelineSummary2: React.FC = () => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const filters = useReleaseFilters();
  const { data: summary } = trpc.releases.summary.useQuery(filters);

  const showReleasePipelineUsage = useCallback(() => <UsageByEnvWrapper />, []);

  if (!summary) {
    return (
      <ProjectStats>
        <ProjectStat
          topStats={[
            {
              title: 'Loading...',
              value: '...',
            },
          ]}
        />
      </ProjectStats>
    );
  }

  return (
    <ProjectStats>
      {summary.lastEnv && (
        <ProjectStat
          topStats={[
            {
              title: `${summary.lastEnv.envName} deploys`,
              value: (
                <>
                  {num(Math.round(summary.lastEnv.deploys / queryPeriodDays))}
                  <span className="font-normal text-sm"> / day</span>
                </>
              ),
              tooltip: `${pluralise(
                summary.lastEnv.deploys,
                'deploy',
                'deploys'
              )} over the last ${pluralise(queryPeriodDays, 'day', 'days')}`,
            },
          ]}
          childStats={[
            {
              title: 'Success',
              value: divide(summary.lastEnv.successful, summary.lastEnv.deploys)
                .map(toPercentage)
                .getOr('-'),
              tooltip: `${num(summary.lastEnv.successful)} of ${pluralise(
                summary.lastEnv.deploys,
                'deploy was',
                'deploys were'
              )} successful over the last ${pluralise(queryPeriodDays, 'day', 'days')}`,
            },
          ]}
          onClick={{
            open: 'popup',
            contents: showReleasePipelineUsage,
          }}
        />
      )}
      <ProjectStat
        topStats={[
          {
            title: 'Starts with artifact',
            value: divide(summary.startsWithArtifact, summary.pipelineCount)
              .map(toPercentage)
              .getOr('-'),
            tooltip: `${num(summary.startsWithArtifact)} of ${pluralise(
              summary.pipelineCount,
              'pipeliine',
              'pipelines'
            )} started with an artifact`,
          },
        ]}
      />
      {(summary.stagesToHighlight || []).map(stage => (
        <Fragment key={stage.name}>
          <ProjectStat
            topStats={[
              {
                title: `${stage.name}: exists`,
                value: divide(stage.exists, summary.pipelineCount)
                  .map(toPercentage)
                  .getOr('-'),
                tooltip: `${num(stage.exists)} out of ${pluralise(
                  summary.pipelineCount,
                  'release pipeline has',
                  'release pipelines have'
                )} a stage named (or containing) ${stage.name}.`,
              },
              {
                title: `${stage.name}: used`,
                value: divide(stage.used, summary.pipelineCount)
                  .map(toPercentage)
                  .getOr('-'),
                tooltip: `${num(stage.used)} out of ${pluralise(
                  summary.pipelineCount,
                  'release piipeline has',
                  'release pipelines have'
                )} a successful deployment from ${stage.name}.`,
              },
            ]}
          />
        </Fragment>
      ))}
      <ProjectStat
        topStats={[
          {
            title: 'Master-only releases',
            value: divide(summary.masterOnly, summary.runCount)
              .map(toPercentage)
              .getOr('-'),
            // <LabelWithSparkline
            //   label={divide(summary.masterOnly, summary.runCount).map(toPercentage).getOr('-')}
            //   data={masterReleasesByWeek}
            //   yAxisLabel={x => `${x}%`}
            //   lineColor={increaseIsBetter(masterReleasesByWeek.filter(exists))}
            //   renderer={pathRendererSkippingUndefineds}
            // />
            tooltip: `${num(summary.masterOnly)} out of ${pluralise(
              summary.runCount,
              'release was',
              'releases were'
            )} exclusively from master.${
              summary.ignoredStagesBefore
                ? `<br />Pipeline runs that didn't go to ${summary.ignoredStagesBefore} are not considered.`
                : ''
            }`,
          },
        ]}
      />
      <ProjectStat
        topStats={[
          {
            title: 'Conforms to branch policies',
            value: divide(summary.branchPolicy.conforms, summary.branchPolicy.total)
              .map(toPercentage)
              .getOr('-'),
            tooltip: `${num(summary.branchPolicy.conforms)} out of ${pluralise(
              summary.branchPolicy.total,
              'artifact is',
              'artifacts are'
            )} from branches that conform<br />to the branch policy.${
              summary.ignoredStagesBefore
                ? `<br />Artifacts that didn't go to ${summary.ignoredStagesBefore} are not considered.`
                : ''
            }`,
          },
        ]}
      />
    </ProjectStats>
  );
};

export default ReleasePipelineSummary2;
