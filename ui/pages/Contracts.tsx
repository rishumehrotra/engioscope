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
          <Stat title="Contracs used by both providers and consumers" value={num(123)} />
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
            <Stat title="Number of specs used as stub" value={num(123)} />
          </div>
        </SummaryCard>
      </div>
      <div className="col-span-2">Service dependencies</div>
    </div>
  );
};
