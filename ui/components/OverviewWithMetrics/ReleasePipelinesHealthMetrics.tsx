import React, { Fragment } from 'react';

import useSse from '../../hooks/use-merge-over-sse.js';
import { isDefined, num, pluralise } from '../../helpers/utils.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import { Stat, SummaryCard } from '../SummaryCard.jsx';
import UsageByEnv from '../UsageByEnv.jsx';
import type { ReleaseStatsSse } from '../../../backend/models/release-listing.js';
import { useCreateUrlForReleasePipelinesSummary } from '../../helpers/sseUrlConfigs.js';

const ReleasePipelinesHealthMetrics = () => {
  const releasePipelinesSseUrl =
    useCreateUrlForReleasePipelinesSummary('release-pipelines');
  const releasePipelinesStats = useSse<ReleaseStatsSse>(releasePipelinesSseUrl, '0');

  return (
    <div>
      <div className="mt-6">
        <h3 className="uppercase text-sm tracking-wide">Releases</h3>
        <div className="grid grid-cols-4 grid-row-2 gap-6 mt-2 col-span-6">
          <SummaryCard className="col-span-2 rounded-lg mt-2 gap-6">
            <div className="grid grid-cols-2 gap-6">
              {isDefined(releasePipelinesStats.releases) &&
              isDefined(releasePipelinesStats.releases?.stagesToHighlight) ? (
                releasePipelinesStats.releases.stagesToHighlight.map(stage => (
                  <Fragment key={stage.name}>
                    <div className="pr-6 border-r border-theme-seperator">
                      <Stat
                        title={`${stage.name}: exists`}
                        value={divide(
                          stage.exists,
                          releasePipelinesStats.releases?.pipelineCount || 0
                        )
                          .map(toPercentage)
                          .getOr('-')}
                        tooltip={`${num(stage.exists)} out of ${pluralise(
                          releasePipelinesStats.releases?.pipelineCount || 0,
                          'release pipeline has',
                          'release pipelines have'
                        )} a stage named (or containing) ${stage.name}.`}
                      />
                    </div>
                    <div>
                      <Stat
                        title={`${stage.name}: used`}
                        value={divide(
                          stage.used,
                          releasePipelinesStats.releases?.pipelineCount || 0
                        )
                          .map(toPercentage)
                          .getOr('-')}
                        tooltip={`${num(stage.used)} out of ${pluralise(
                          releasePipelinesStats.releases?.pipelineCount || 0,
                          'release piipeline has',
                          'release pipelines have'
                        )} a successful deployment from ${stage.name}.`}
                      />
                    </div>
                  </Fragment>
                ))
              ) : (
                <div className="col-span-2">
                  <Stat title="Stages to highlight" value="-" />
                </div>
              )}
            </div>
          </SummaryCard>

          <SummaryCard className="col-span-1 rounded-lg mt-2 gap-6">
            <Stat
              title="Conforms to branch policies"
              value={
                isDefined(releasePipelinesStats.releasesBranchPolicy)
                  ? divide(
                      releasePipelinesStats.releasesBranchPolicy.conforms,
                      releasePipelinesStats.releasesBranchPolicy.total
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : '-'
              }
              tooltip={
                isDefined(releasePipelinesStats.releasesBranchPolicy) &&
                isDefined(releasePipelinesStats.releases)
                  ? `${num(
                      releasePipelinesStats.releasesBranchPolicy.conforms
                    )} out of ${pluralise(
                      releasePipelinesStats.releasesBranchPolicy.total,
                      'artifact is',
                      'artifacts are'
                    )} from branches that conform<br />to the branch policy.${
                      isDefined(releasePipelinesStats.releases.ignoredStagesBefore)
                        ? `<br />Artifacts that didn't go to ${releasePipelinesStats.releases.ignoredStagesBefore} are not considered.`
                        : ''
                    }`
                  : undefined
              }
            />
          </SummaryCard>
          <SummaryCard className="col-span-1 rounded-lg mt-2 gap-6">
            <Stat
              title="Starts with artifact"
              value={
                isDefined(releasePipelinesStats.releases)
                  ? divide(
                      releasePipelinesStats.releases.startsWithArtifact,
                      releasePipelinesStats.releases.pipelineCount
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : '-'
              }
              tooltip={
                isDefined(releasePipelinesStats.releases)
                  ? `${num(
                      releasePipelinesStats.releases.startsWithArtifact
                    )} of ${pluralise(
                      releasePipelinesStats.releases.pipelineCount,
                      'pipeliine',
                      'pipelines'
                    )} started with an artifact`
                  : undefined
              }
            />
          </SummaryCard>
        </div>
        <div className="grid grid-cols-4 grid-row-2 gap-6 mt-2 col-span-6">
          <SummaryCard className="col-span-2 row-span-2 grid grid-cols-2 gap-6 rounded-lg">
            {isDefined(releasePipelinesStats.usageByEnv) ? (
              <div className="col-span-2">
                <h3 className="font-semibold mb-3 flex items-center">
                  Usage By Environments
                </h3>
                <UsageByEnv perEnvUsage={releasePipelinesStats.usageByEnv} />
              </div>
            ) : (
              <div className="col-span-2">
                <Stat title="Usage By Environments" value="-" />
              </div>
            )}
          </SummaryCard>
          <SummaryCard className="col-span-1 row-span-1 rounded-lg">
            <Stat
              title="Master-only releases"
              value={
                isDefined(releasePipelinesStats.releases)
                  ? divide(
                      releasePipelinesStats.releases.masterOnly,
                      releasePipelinesStats.releases.runCount
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : '-'
              }
              tooltip={
                isDefined(releasePipelinesStats.releases)
                  ? `${num(releasePipelinesStats.releases.masterOnly)} out of ${pluralise(
                      releasePipelinesStats.releases.runCount,
                      'release was',
                      'releases were'
                    )} exclusively from master.${
                      releasePipelinesStats.releases.ignoredStagesBefore
                        ? `<br />Pipeline runs that didn't go to ${releasePipelinesStats.releases.ignoredStagesBefore} are not considered.`
                        : ''
                    }`
                  : undefined
              }
            />
          </SummaryCard>
        </div>
      </div>
    </div>
  );
};

export default ReleasePipelinesHealthMetrics;
