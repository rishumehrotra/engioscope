import React, { Fragment, useCallback, useMemo } from 'react';
import { isDefined, num, pluralise } from '../helpers/utils.js';
import ProjectStat from './ProjectStat.jsx';
import ProjectStats from './ProjectStats.jsx';
import { divide, toPercentage } from '../../shared/utils.js';
import { trpc } from '../helpers/trpc.js';
import useReleaseFilters from '../hooks/use-release-filters.js';
import UsageByEnv from './UsageByEnv.jsx';
import Loading from './Loading.jsx';
import { useQueryContext, useQueryPeriodDays } from '../hooks/query-hooks.js';
import useFeatureFlag from '../hooks/use-feature-flag.js';
import { Stat, SummaryCard } from './SummaryCard.jsx';
import useMergeOverSse from '../hooks/use-merge-over-sse.js';
import type { ReleaseStatsSse } from '../../backend/models/release-listing.js';
import useRepoFilters from '../hooks/use-repo-filters.js';

const UsageByEnvWrapper = () => {
  const filters = useReleaseFilters();
  const { data: usageByEnv } = trpc.releases.usageByEnvironment.useQuery(filters);

  return (
    <div className="w-96">
      {usageByEnv ? <UsageByEnv perEnvUsage={usageByEnv} /> : <Loading />}
    </div>
  );
};

const useCreateUrlWithFilter = (slug: string) => {
  const queryContext = useQueryContext();
  const filters = useRepoFilters();
  return useMemo(() => {
    return `/api/${queryContext[0]}/${queryContext[1]}/${slug}?${new URLSearchParams({
      startDate: queryContext[2].toISOString(),
      endDate: queryContext[3].toISOString(),
      ...(filters.teams ? { teams: filters.teams.join(',') } : {}),
    }).toString()}`;
  }, [filters.teams, queryContext, slug]);
};

const ReleasePipelineSummary2: React.FC = () => {
  const sseUrl = useCreateUrlWithFilter('release-pipelines');

  const summarySse = useMergeOverSse<ReleaseStatsSse>(sseUrl, '0');

  const queryPeriodDays = useQueryPeriodDays();
  const filters = useReleaseFilters();
  const { data: summary } = trpc.releases.summary.useQuery(filters);
  const isSummaryV2Enabled = useFeatureFlag('release-pipelines-v2');
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
  if (isSummaryV2Enabled) {
    return (
      <div className="grid grid-cols-4 grid-row-2 gap-6 mt-2 mb-6">
        <SummaryCard className="grid grid-cols-2 col-span-2 rounded-lg">
          <div className="col-span-1 border-r border-theme-seperator">
            <Stat
              title={
                isDefined(summarySse.releases) && isDefined(summarySse.releases.lastEnv)
                  ? `${summarySse.releases.lastEnv.envName} deploys`
                  : 'Deploys'
              }
              value={
                isDefined(summarySse.releases) &&
                isDefined(summarySse.releases.lastEnv) ? (
                  <>
                    {num(
                      Math.round(summarySse.releases.lastEnv.deploys / queryPeriodDays)
                    )}
                    <span className="font-normal text-sm"> / day</span>
                  </>
                ) : (
                  '-'
                )
              }
              tooltip={
                isDefined(summarySse.releases) && isDefined(summarySse.releases.lastEnv)
                  ? `${pluralise(
                      summarySse.releases.lastEnv.deploys,
                      'deploy',
                      'deploys'
                    )} over the last ${pluralise(queryPeriodDays, 'day', 'days')}`
                  : undefined
              }
            />
          </div>
          <div className="col-span-1 pl-6">
            <Stat
              title="Success"
              value={
                isDefined(summarySse.releases) && isDefined(summarySse.releases.lastEnv)
                  ? divide(
                      summarySse.releases.lastEnv.successful || 0,
                      summarySse.releases.lastEnv.deploys
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : '-'
              }
              tooltip={
                isDefined(summarySse.releases) && isDefined(summarySse.releases.lastEnv)
                  ? `${num(summarySse.releases.lastEnv.successful)} of ${pluralise(
                      summarySse.releases.lastEnv.deploys,
                      'deploy was',
                      'deploys were'
                    )} successful over the last ${pluralise(
                      queryPeriodDays,
                      'day',
                      'days'
                    )}`
                  : undefined
              }
              {...(isDefined(summarySse.releases) &&
              isDefined(summarySse.releases.lastEnv)
                ? {
                    onClick: {
                      open: 'drawer',
                      heading: 'Usage by environment',
                      body: (
                        <div className="p-2">
                          <UsageByEnvWrapper />
                        </div>
                      ),
                    },
                  }
                : {})}
            />
          </div>
        </SummaryCard>
        <SummaryCard className="grid grid-cols-2 col-span-2 rounded-lg">
          {isDefined(summarySse.releases) &&
          isDefined(summarySse.releases.stagesToHighlight) ? (
            summarySse.releases.stagesToHighlight.map(stage => (
              <Fragment key={stage.name}>
                <div className="col-span-1 border-r border-theme-seperator">
                  <Stat
                    title={`${stage.name}: exists`}
                    value={
                      isDefined(summarySse.releases)
                        ? divide(stage.exists, summarySse.releases.pipelineCount)
                            .map(toPercentage)
                            .getOr('-')
                        : undefined
                    }
                    tooltip={
                      isDefined(summarySse.releases)
                        ? `${num(stage.exists)} out of ${pluralise(
                            summarySse.releases.pipelineCount,
                            'release pipeline has',
                            'release pipelines have'
                          )} a stage named (or containing) ${stage.name}.`
                        : undefined
                    }
                  />
                </div>
                <div className="col-span-1 pl-6">
                  <Stat
                    title={`${stage.name}: used`}
                    value={
                      isDefined(summarySse.releases)
                        ? divide(stage.used, summarySse.releases.pipelineCount)
                            .map(toPercentage)
                            .getOr('-')
                        : undefined
                    }
                    tooltip={
                      isDefined(summarySse.releases)
                        ? `${num(stage.used)} out of ${pluralise(
                            summarySse.releases.pipelineCount,
                            'release piipeline has',
                            'release pipelines have'
                          )} a successful deployment from ${stage.name}.`
                        : undefined
                    }
                  />
                </div>
              </Fragment>
            ))
          ) : (
            <div className="col-span-2">
              <Stat title="Stages to highlight" value="-" />
            </div>
          )}
        </SummaryCard>
        <SummaryCard className="rounded-lg">
          <Stat
            title="Branch policies"
            value={
              isDefined(summarySse.releasesBranchPolicy)
                ? divide(
                    summarySse.releasesBranchPolicy.conforms,
                    summarySse.releasesBranchPolicy.total
                  )
                    .map(toPercentage)
                    .getOr('-')
                : '-'
            }
            tooltip={
              isDefined(summarySse.releasesBranchPolicy)
                ? `${num(summarySse.releasesBranchPolicy.conforms)} out of ${pluralise(
                    summarySse.releasesBranchPolicy.total,
                    'artifact is',
                    'artifacts are'
                  )} from branches that conform<br />to the branch policy.${
                    summarySse.releases?.ignoredStagesBefore
                      ? `<br />Pipeline runs that didn't go to ${summarySse.releases.ignoredStagesBefore} are not considered.`
                      : ''
                  }`
                : undefined
            }
          />
        </SummaryCard>
        <SummaryCard className="rounded-lg">
          <Stat
            title="Starts with artifact"
            value={
              isDefined(summarySse.releases)
                ? divide(
                    summarySse.releases.startsWithArtifact,
                    summarySse.releases.pipelineCount
                  )
                    .map(toPercentage)
                    .getOr('-')
                : '-'
            }
            tooltip={
              isDefined(summarySse.releases)
                ? `${num(summarySse.releases.startsWithArtifact)} of ${pluralise(
                    summarySse.releases.pipelineCount,
                    'pipeline',
                    'pipelines'
                  )} started with an artifact`
                : undefined
            }
          />
        </SummaryCard>
        <SummaryCard className="rounded-lg">
          <Stat
            title="Master-only releases"
            value={
              isDefined(summarySse.releases)
                ? divide(summarySse.releases.masterOnly, summarySse.releases.runCount)
                    .map(toPercentage)
                    .getOr('-')
                : '-'
            }
            tooltip={
              isDefined(summarySse.releases) &&
              isDefined(summarySse.releases.masterOnly) &&
              isDefined(summarySse.releases.runCount)
                ? `${num(summarySse.releases.masterOnly)} out of ${pluralise(
                    summarySse.releases.runCount,
                    'release was',
                    'releases were'
                  )} exclusively from master.${
                    summarySse.releases?.ignoredStagesBefore
                      ? `<br />Pipeline runs that didn't go to ${summarySse.releases.ignoredStagesBefore} are not considered.`
                      : ''
                  }`
                : undefined
            }
          />
        </SummaryCard>
      </div>
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
