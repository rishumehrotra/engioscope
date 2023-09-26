import React, { useMemo } from 'react';
import { multiply } from 'rambda';
import { Stat, SummaryCard } from '../components/SummaryCard.jsx';
import { minPluralise, num } from '../helpers/utils.js';
import { useQueryContext } from '../hooks/query-hooks.js';
import type { ContractStats } from '../../backend/models/contracts';
import useSse from '../hooks/use-merge-over-sse.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { increaseIsBetter } from '../components/graphs/TinyAreaGraph.jsx';

const isDefined = <T,>(val: T | undefined): val is T => val !== undefined;
const bold = (x: string | number) => `<span class="font-medium">${x}</span>`;

const useCreateUrlWithFilter = (slug: string) => {
  const queryContext = useQueryContext();
  return useMemo(() => {
    return `/api/${queryContext[0]}/${queryContext[1]}/${slug}?${new URLSearchParams({
      startDate: queryContext[2].toISOString(),
      endDate: queryContext[3].toISOString(),
    }).toString()}`;
  }, [queryContext, slug]);
};

export default () => {
  const sseUrl = useCreateUrlWithFilter('contracts');
  const contractsStats = useSse<ContractStats>(sseUrl, '0');

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <SummaryCard className="mb-4 rounded-md">
          <Stat
            title="Contracts used by both providers and consumers"
            tooltip={
              isDefined(contractsStats.weeklyConsumerProducerSpecs)
                ? [
                    bold(
                      num(contractsStats.weeklyConsumerProducerSpecs.at(-1)?.count || 0)
                    ),
                    'out of',
                    bold(
                      num(contractsStats.weeklyConsumerProducerSpecs.at(-1)?.total || 0)
                    ),
                    minPluralise(
                      contractsStats.weeklyConsumerProducerSpecs.at(-1)?.count || 0,
                      'spec has',
                      'specs have'
                    ),
                    'been used by both providers and consumers',
                  ].join(' ')
                : undefined
            }
            value={
              isDefined(contractsStats.weeklyConsumerProducerSpecs)
                ? contractsStats.weeklyConsumerProducerSpecs.at(-1)?.count || 0
                : null
            }
            graphPosition="right"
            graphData={contractsStats.weeklyConsumerProducerSpecs}
            graphColor={
              isDefined(contractsStats.weeklyConsumerProducerSpecs)
                ? increaseIsBetter(
                    contractsStats.weeklyConsumerProducerSpecs.map(w => w.count)
                  )
                : null
            }
            graphItemToValue={x => x.count}
            graphDataPointLabel={x =>
              [
                bold(num(x.count)),
                'out of',
                bold(num(x.total)),
                minPluralise(x.count, 'spec has', 'specs have'),
                'been used by both providers and consumers',
              ].join(' ')
            }
          />
        </SummaryCard>
        <SummaryCard className="mb-4 rounded-md">
          <div className="border-b border-theme-seperator pb-6">
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
                      'of',
                      bold(
                        num(contractsStats.weeklyApiCoverage.at(-1)?.totalOperations || 0)
                      ),
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
                  ? divide(
                      contractsStats.weeklyApiCoverage.at(-1)?.coveredOperations || 0,
                      contractsStats.weeklyApiCoverage.at(-1)?.totalOperations || 0
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
              graphPosition="right"
              graphData={contractsStats.weeklyApiCoverage}
              graphColor={
                isDefined(contractsStats.weeklyApiCoverage)
                  ? increaseIsBetter(
                      contractsStats.weeklyApiCoverage.map(w =>
                        divide(w.coveredOperations, w.totalOperations)
                          .map(multiply(100))
                          .getOr(0)
                      )
                    )
                  : null
              }
              graphItemToValue={x =>
                divide(x.coveredOperations, x.totalOperations).map(multiply(100)).getOr(0)
              }
              graphDataPointLabel={x =>
                [
                  bold(num(x.coveredOperations)),
                  ' covered operations of ',
                  bold(num(x.totalOperations)),
                  ' total operations',
                ].join('')
              }
            />
          </div>
          <div className="pt-6">
            <Stat
              title="Number of specs used as stub"
              tooltip={
                isDefined(contractsStats.weeklyStubUsage)
                  ? [
                      bold(
                        num(
                          (contractsStats.weeklyStubUsage.at(-1)?.totalOperations || 0) -
                            (contractsStats.weeklyStubUsage.at(-1)?.zeroCountOperations ||
                              0)
                        )
                      ),
                      'of',
                      bold(
                        num(contractsStats.weeklyStubUsage.at(-1)?.totalOperations || 0)
                      ),
                      minPluralise(
                        (contractsStats.weeklyStubUsage.at(-1)?.totalOperations || 0) -
                          (contractsStats.weeklyStubUsage.at(-1)?.totalOperations || 0),
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
                      'of',
                      bold(
                        num(contractsStats.weeklyStubUsage.at(-1)?.totalOperations || 0)
                      ),
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
                  ? (contractsStats.weeklyStubUsage.at(-1)?.totalOperations || 0) -
                    (contractsStats.weeklyStubUsage.at(-1)?.zeroCountOperations || 0)
                  : null
              }
              graphPosition="right"
              graphData={contractsStats.weeklyStubUsage}
              graphColor={
                isDefined(contractsStats.weeklyStubUsage)
                  ? increaseIsBetter(
                      contractsStats.weeklyStubUsage.map(
                        w => w.totalOperations - w.zeroCountOperations
                      )
                    )
                  : null
              }
              graphItemToValue={x => x.totalOperations - x.zeroCountOperations}
              graphDataPointLabel={x =>
                [
                  bold(num(x.totalOperations - x.zeroCountOperations)),
                  ' stub usage of ',
                  bold(num(x.totalOperations)),
                  ' total operations',
                  '<br />',
                  bold(num(x.zeroCountOperations)),
                  ' zero count stub usage of ',
                  bold(num(x.totalOperations)),
                  ' total operations',
                ].join('')
              }
            />
          </div>
        </SummaryCard>
      </div>
      <div className="col-span-2">Service dependencies</div>
    </div>
  );
};
