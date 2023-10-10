import React from 'react';
import useSse from '../../hooks/use-merge-over-sse.js';
import { Stat, SummaryCard } from '../SummaryCard.jsx';
import { bold, isDefined, minPluralise, num } from '../../helpers/utils.js';
import { increaseIsBetter } from '../graphs/TinyAreaGraph.jsx';
import { divide, toPercentage } from '../../../shared/utils.js';
import type { ContractStats } from '../../../backend/models/contracts.js';
import ServiceChordDiagram from './ServiceChordDiagram.jsx';
import ServiceBlock from './ServiceBlock.jsx';
import { useCreateUrlForContractsSummary } from '../../helpers/sseUrlConfigs.js';

export default () => {
  const sseUrl = useCreateUrlForContractsSummary('contracts');
  const contractsStats = useSse<ContractStats>(sseUrl, '0');

  return (
    <>
      <div className="grid grid-cols-4 gap-6">
        <SummaryCard className="col-span-1 mb-4 rounded-md">
          <Stat
            title="Operations used by both providers and consumers"
            tooltip={
              isDefined(contractsStats.weeklyConsumerProducerSpecAndOps)
                ? [
                    bold(
                      num(
                        contractsStats.weeklyConsumerProducerSpecAndOps.at(-1)?.count || 0
                      )
                    ),
                    'out of',
                    bold(
                      num(
                        contractsStats.weeklyConsumerProducerSpecAndOps.at(-1)?.total || 0
                      )
                    ),
                    minPluralise(
                      contractsStats.weeklyConsumerProducerSpecAndOps.at(-1)?.count || 0,
                      'operation has',
                      'operations have'
                    ),
                    'been used by both providers and consumers',
                  ].join(' ')
                : undefined
            }
            value={
              isDefined(contractsStats.weeklyConsumerProducerSpecAndOps)
                ? contractsStats.weeklyConsumerProducerSpecAndOps.at(-1)?.count || 0
                : null
            }
            graphPosition="bottom"
            graphData={contractsStats.weeklyConsumerProducerSpecAndOps}
            graphColor={
              isDefined(contractsStats.weeklyConsumerProducerSpecAndOps)
                ? increaseIsBetter(
                    contractsStats.weeklyConsumerProducerSpecAndOps.map(w => w.count)
                  )
                : null
            }
            graphItemToValue={x => x.count}
            graphDataPointLabel={x =>
              [
                bold(num(x.count)),
                'out of',
                bold(num(x.total)),
                minPluralise(x.count, 'operation has', 'operations have'),
                'been used by both providers and consumers',
              ].join(' ')
            }
          />
        </SummaryCard>
        <SummaryCard className="col-span-3 mb-4 rounded-md grid grid-cols-3">
          <div className="border-r border-theme-seperator pr-6 col-span-1">
            <Stat
              title="API coverage"
              tooltip={
                isDefined(contractsStats.weeklyApiCoverage)
                  ? [
                      bold(
                        num(
                          contractsStats.weeklyApiCoverage.at(-1)?.coveredOperations || 0
                        )
                      ),
                      ...(contractsStats.specmaticCentralRepoReportOperations
                        ? [
                            'of',
                            bold(
                              num(contractsStats.specmaticCentralRepoReportOperations)
                            ),
                          ]
                        : []),
                      minPluralise(
                        contractsStats.weeklyApiCoverage.at(-1)?.coveredOperations || 0,
                        'operation has',
                        'operations have'
                      ),
                      'been covered',
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(contractsStats.weeklyApiCoverage)
                  ? contractsStats.specmaticCentralRepoReportOperations
                    ? divide(
                        contractsStats.weeklyApiCoverage.at(-1)?.coveredOperations || 0,
                        contractsStats.specmaticCentralRepoReportOperations
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : num(contractsStats.weeklyApiCoverage.at(-1)?.coveredOperations || 0)
                  : null
              }
              graphPosition="bottom"
              graphData={contractsStats.weeklyApiCoverage}
              graphColor={
                isDefined(contractsStats.weeklyApiCoverage)
                  ? increaseIsBetter(
                      contractsStats.weeklyApiCoverage.map(w => w.coveredOperations)
                    )
                  : null
              }
              graphItemToValue={x => x.coveredOperations}
              graphDataPointLabel={x =>
                [bold(num(x.coveredOperations)), ' operations covered.'].join('')
              }
            />
          </div>
          <div className="border-r border-theme-seperator px-6 col-span-1">
            <Stat
              title="Number of operations used as stub"
              tooltip={
                isDefined(contractsStats.weeklyStubUsage)
                  ? [
                      bold(
                        num(contractsStats.weeklyStubUsage.at(-1)?.usedOperations || 0)
                      ),
                      ...(contractsStats.specmaticCentralRepoReportOperations
                        ? [
                            'of',
                            bold(
                              num(contractsStats.specmaticCentralRepoReportOperations)
                            ),
                          ]
                        : []),
                      minPluralise(
                        contractsStats.weeklyStubUsage.at(-1)?.usedOperations || 0,
                        'operation has',
                        'operations have'
                      ),
                      'been used as stubs for tests',
                      '<br />',
                      bold(
                        num(
                          contractsStats.weeklyStubUsage.at(-1)?.zeroCountOperations || 0
                        )
                      ),
                      ...(contractsStats.specmaticCentralRepoReportOperations
                        ? [
                            'of',
                            bold(
                              num(
                                contractsStats.specmaticCentralRepoReportOperations || 0
                              )
                            ),
                          ]
                        : []),
                      minPluralise(
                        contractsStats.weeklyStubUsage.at(-1)?.zeroCountOperations || 0,
                        'operation has',
                        'operations have'
                      ),
                      "set up stubs for tests but haven't used them",
                      '<br />',
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(contractsStats.weeklyStubUsage)
                  ? contractsStats.weeklyStubUsage.at(-1)?.usedOperations || 0
                  : null
              }
              graphPosition="bottom"
              graphData={contractsStats.weeklyStubUsage}
              graphColor={
                isDefined(contractsStats.weeklyStubUsage)
                  ? increaseIsBetter(
                      contractsStats.weeklyStubUsage.map(w => w.usedOperations)
                    )
                  : null
              }
              graphItemToValue={x => x.usedOperations}
              graphDataPointLabel={x =>
                [
                  bold(num(x.usedOperations)),
                  ' stub usage operations ',
                  '<br />',
                  bold(num(x.zeroCountOperations)),
                  ' zero count stub usage operations',
                ].join('')
              }
            />
          </div>
          <div className="pl-6 col-span-1">
            <div className="pb-6">
              <Stat
                title="Number of stubs in central repo"
                value={contractsStats.centralRepoStubsCount}
              />
            </div>
            <div>
              <Stat
                title="Number of stubs in project repo"
                value={contractsStats.projectRepoStubsCount}
              />
            </div>
          </div>
        </SummaryCard>
      </div>
      <div className="w-full h-[30rem] py-12">
        <h3 className="font-semibold mb-3 flex items-center">Service dependencies</h3>
        <ServiceChordDiagram />
      </div>

      <ServiceBlock />
    </>
  );
};
