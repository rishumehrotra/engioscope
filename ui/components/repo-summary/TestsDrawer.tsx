import React, { useMemo } from 'react';
import { byString, byNum, asc } from 'sort-lib';
import { multiply, prop } from 'rambda';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import type { DrawerTableProps } from './DrawerTable.jsx';
import DrawerTable from './DrawerTable.jsx';
import useRepoFilters from '../../hooks/use-repo-filters.js';
import { HappyEmpty, SadEmpty } from './Empty.jsx';
import { divide, shouldNeverReachHere, toPercentage } from '../../../shared/utils.js';
import InlineSelect from '../common/InlineSelect.jsx';
import { LabelWithSparkline } from '../graphs/Sparkline.jsx';
import { increaseIsBetter } from '../summary-page/utils.jsx';
import { pathRendererSkippingUndefineds } from '../graphs/sparkline-renderers.jsx';

type TestsAndCoverageRepoItem =
  RouterClient['tests']['getReposListingForTestsDrawer'][number];

type TestsAndCoverageDefItem =
  RouterClient['tests']['getReposListingForTestsDrawer'][number]['definitions'][number];

type TestsAndCoverageDefListProps = {
  definitions: TestsAndCoverageDefItem[];
};
type PipelineTypes = 'all' | 'withTests' | 'withCoverage';

const TestsGraph: React.FC<{ pipeline: TestsAndCoverageDefItem }> = ({ pipeline }) => {
  return pipeline.tests?.length ? (
    <LabelWithSparkline
      label={
        <a
          href={pipeline.url}
          target="_blank"
          rel="noreferrer"
          data-tooltip-id="react-tooltip"
          data-tooltip-content={pipeline.name}
          className={
            pipeline.latestTest?.hasTests
              ? 'link-text truncate w-full'
              : 'link-text truncate w-full opacity-60'
          }
        >
          {pipeline.latestTest?.hasTests ? pipeline.latestTest.totalTests : 0}
        </a>
      }
      data={pipeline.tests
        .sort(asc(byNum(prop('weekIndex'))))
        .map(t => (t.hasTests ? t.totalTests : undefined))}
      lineColor={increaseIsBetter(
        pipeline.tests.map(t => (t.hasTests ? t.totalTests : 0))
      )}
      renderer={pathRendererSkippingUndefineds}
    />
  ) : (
    <a
      href={pipeline.url}
      target="_blank"
      rel="noreferrer"
      data-tooltip-id="react-tooltip"
      data-tooltip-content={pipeline.name}
      className="link-text truncate w-full opacity-60"
    >
      {pipeline.latestTest?.hasTests ? pipeline.latestTest.totalTests : 0}
    </a>
  );
};

const TestsAndCoverageDefinitions: React.FC<TestsAndCoverageDefListProps> = ({
  definitions,
}) => {
  return (
    <DrawerTable
      data={definitions}
      rowKey={x => x.id.toString()}
      isChild
      columns={[
        {
          title: 'Name',
          key: 'definitionName',

          // eslint-disable-next-line react/no-unstable-nested-components
          value: x =>
            x.url === null ? (
              x.name
            ) : (
              <a className="link-text" href={x.url} target="_blank" rel="noreferrer">
                {x.name}
              </a>
            ),
          sorter: byString(x => x.name.toLocaleLowerCase()),
        },
        {
          title: 'Total Tests',
          key: 'totalTests',

          // eslint-disable-next-line react/no-unstable-nested-components
          value: x => <TestsGraph pipeline={x} />,
          sorter: byNum(x => (x.latestTest?.hasTests ? x.latestTest.totalTests : 0)),
        },
        {
          title: 'Failed',
          key: 'failedTests',

          value: x =>
            x.latestTest?.hasTests
              ? x.latestTest.totalTests - x.latestTest.passedTests
              : 0,
          sorter: byNum(x =>
            x.latestTest?.hasTests
              ? x.latestTest.totalTests - x.latestTest.passedTests
              : 0
          ),
        },
        {
          title: 'Coverage',
          key: 'coverage',
          value: x =>
            x.latestCoverage?.hasCoverage
              ? divide(
                  x.latestCoverage.coverage?.coveredBranches || 0,
                  x.latestCoverage.coverage?.totalBranches || 0
                )
                  .map(toPercentage)
                  .getOr('_')
              : '-',

          sorter: byNum(x =>
            x.latestCoverage?.hasCoverage
              ? divide(
                  x.latestCoverage.coverage?.coveredBranches || 0,
                  x.latestCoverage.coverage?.totalBranches || 0
                )
                  .map(multiply(100))
                  .getOr(0)
              : 0
          ),
        },
      ]}
      defaultSortColumnIndex={1}
    />
  );
};

const testsAndCoverageRepoItemProps: Omit<
  DrawerTableProps<TestsAndCoverageRepoItem>,
  'data'
> = {
  rowKey: x => x.repositoryId,
  columns: [
    {
      title: 'Repositories',
      key: 'repos',
      value: x => x.repositoryName,
      sorter: byString(x => x.repositoryName.toLocaleLowerCase()),
    },
    {
      title: 'All tests',
      key: 'tests',
      value: x => x.totalTests,
      sorter: byNum(x => x.totalTests),
    },
  ],
  ChildComponent: ({ item }) =>
    item.definitions?.length > 0 ? (
      <TestsAndCoverageDefinitions definitions={item.definitions} />
    ) : null,
  defaultSortColumnIndex: 1,
};

const TestsDrawer: React.FC<{ pipelineType: PipelineTypes }> = ({
  pipelineType: pipelinesTypeProp,
}) => {
  const filters = useRepoFilters();

  const repos = trpc.tests.getReposListingForTestsDrawer.useQuery({
    queryContext: filters.queryContext,
    searchTerms: filters.searchTerms,
    groupsIncluded: filters.groupsIncluded,
    teams: filters.teams,
  });

  const [statusType, setStatusType] = React.useState<PipelineTypes>(
    pipelinesTypeProp ?? 'all'
  );

  const emptyMessage = useMemo(() => {
    if (statusType === 'all') {
      return (
        <SadEmpty
          heading="No repositories found"
          body="There are currently no repositories having tests and reporting coverage"
        />
      );
    }
    if (statusType === 'withTests') {
      return (
        <SadEmpty
          heading="No repositories found"
          body="There are currently no repositories having tests"
        />
      );
    }
    if (statusType === 'withCoverage') {
      return (
        <HappyEmpty
          heading="No repositories found"
          body="There are currently no repositories reporting coverage"
        />
      );
    }
    return shouldNeverReachHere(statusType);
  }, [statusType]);
  const repoList = repos.data;

  if (repoList?.length === 0) {
    return emptyMessage;
  }
  return (
    <>
      <InlineSelect
        id="status"
        value={statusType}
        options={[
          { label: 'All pipelines', value: 'all' },
          { label: 'Pipelines running tests', value: 'withTests' },
          { label: 'Pipelines reporting coverage', value: 'withCoverage' },
        ]}
        onChange={e => setStatusType(e as PipelineTypes)}
      />
      <DrawerTable data={repoList} {...testsAndCoverageRepoItemProps} />
    </>
  );
};
export default TestsDrawer;
