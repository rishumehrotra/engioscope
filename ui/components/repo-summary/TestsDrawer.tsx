import React, { useMemo } from 'react';
import { byString, byNum } from 'sort-lib';
import { multiply } from 'rambda';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import type { SortableTableProps } from '../common/SortableTable.jsx';
import SortableTable from '../common/SortableTable.jsx';
import useRepoFilters from '../../hooks/use-repo-filters.js';
import { HappyEmpty, SadEmpty } from './Empty.jsx';
import { divide, shouldNeverReachHere, toPercentage } from '../../../shared/utils.js';
import InlineSelect from '../common/InlineSelect.jsx';

type TestsAndCoverageRepoItem =
  RouterClient['tests']['getReposListingForTestsDrawer'][number];

type TestsAndCoverageDefItem =
  RouterClient['tests']['getReposListingForTestsDrawer'][number]['definitions'][number];

type TestsAndCoverageDefListProps = {
  definitions: TestsAndCoverageDefItem[];
};
type PipelineTypes =
  | 'all'
  | 'withTests'
  | 'withCoverage'
  | 'withoutTests'
  | 'withoutCoverage';

const TestsAndCoverageDefinitions: React.FC<TestsAndCoverageDefListProps> = ({
  definitions,
}) => {
  return (
    <SortableTable
      variant="drawer"
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

          value: x => (x.latestTest?.hasTests ? x.latestTest.totalTests : '-'),
          sorter: byNum(x => (x.latestTest?.hasTests ? x.latestTest.totalTests : 0)),
        },
        {
          title: 'Failed',
          key: 'failedTests',

          value: x =>
            x.latestTest?.hasTests
              ? x.latestTest.totalTests - x.latestTest.passedTests
              : '-',
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
  SortableTableProps<TestsAndCoverageRepoItem>,
  'data'
> = {
  variant: 'drawer',
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
    teams: filters.teams,
  });

  const [statusType, setStatusType] = React.useState<PipelineTypes>(
    pipelinesTypeProp ?? 'all'
  );

  const emptyMessage = useMemo(() => {
    if (statusType === 'all') {
      return (
        <div className="my-32">
          <SadEmpty
            heading="No repositories found"
            body="There are currently no repositories having tests and reporting coverage"
          />
        </div>
      );
    }
    if (statusType === 'withTests') {
      return (
        <div className="my-32">
          <SadEmpty
            heading="No repositories found"
            body="There are currently no repositories having tests"
          />
        </div>
      );
    }
    if (statusType === 'withCoverage') {
      return (
        <div className="my-32">
          <SadEmpty
            heading="No repositories found"
            body="There are currently no repositories reporting coverage"
          />
        </div>
      );
    }
    if (statusType === 'withoutTests') {
      return (
        <div className="my-32">
          <HappyEmpty
            heading="No repositories found"
            body="There are currently no repositories which are not reporting tests"
          />
        </div>
      );
    }
    if (statusType === 'withoutCoverage') {
      return (
        <div className="my-32">
          <HappyEmpty
            heading="No repositories found"
            body="There are currently no repositories which are not reporting coverage"
          />
        </div>
      );
    }
    return shouldNeverReachHere(statusType);
  }, [statusType]);

  const repoList = repos.data;

  const filteredRepoList = repoList?.filter(repo => {
    if (statusType === 'all') {
      return true;
    }
    if (statusType === 'withTests') {
      return repo.totalTests > 0;
    }

    if (statusType === 'withoutTests') {
      // return repo.totalTests === 0;
      const { definitions, totalTests } = repo;
      return (
        (totalTests === 0 ||
          definitions?.some(
            d =>
              d.latestTest?.hasTests === false ||
              d.latestTest === null ||
              d.latestTest.totalTests === 0
          )) ??
        false
      );
    }

    if (statusType === 'withCoverage') {
      const { definitions } = repo;
      return (
        definitions?.some(
          d =>
            d.latestCoverage?.hasCoverage === true &&
            d.latestCoverage?.coverage?.coveredBranches
        ) ?? false
      );
    }

    if (statusType === 'withoutCoverage') {
      const { definitions } = repo;
      return (
        definitions?.some(
          d => d.latestCoverage?.hasCoverage === false || d.latestCoverage !== null
        ) ?? false
      );
    }
    return shouldNeverReachHere(statusType);
  });

  const filteredPipelinesRepoList = filteredRepoList?.map(repo => {
    if (statusType === 'all') {
      return repo;
    }
    if (statusType === 'withTests') {
      return {
        ...repo,
        definitions:
          repo.definitions?.filter(
            d => d.latestTest?.hasTests === true && d.latestTest.totalTests > 0
          ) ?? [],
      };
    }
    if (statusType === 'withoutTests') {
      return {
        ...repo,
        definitions:
          repo.definitions?.filter(
            d =>
              d.latestTest?.hasTests === false ||
              d.latestTest === null ||
              d.latestTest.totalTests === 0
          ) ?? [],
      };
    }
    if (statusType === 'withCoverage') {
      return {
        ...repo,
        definitions:
          repo.definitions?.filter(
            d =>
              d.latestCoverage?.hasCoverage &&
              d.latestCoverage?.coverage?.coveredBranches &&
              d.latestCoverage?.coverage?.coveredBranches > 0
          ) ?? [],
      };
    }
    if (statusType === 'withoutCoverage') {
      return {
        ...repo,
        definitions:
          repo.definitions?.filter(
            d =>
              d.latestCoverage?.hasCoverage === false ||
              !d.latestCoverage?.coverage?.coveredBranches
          ) ?? [],
      };
    }
    return shouldNeverReachHere(statusType);
  });

  return (
    <>
      <InlineSelect
        id="status"
        value={statusType}
        options={[
          { label: 'All pipelines', value: 'all' },
          { label: 'Pipelines running tests', value: 'withTests' },
          { label: 'Pipelines reporting coverage', value: 'withCoverage' },
          { label: 'Pipelines not running tests', value: 'withoutTests' },
          { label: 'Pipelines not reporting coverage', value: 'withoutCoverage' },
        ]}
        onChange={e => setStatusType(e as PipelineTypes)}
      />
      {filteredPipelinesRepoList?.length === 0 ? (
        emptyMessage
      ) : (
        <SortableTable
          data={filteredPipelinesRepoList}
          {...testsAndCoverageRepoItemProps}
        />
      )}
    </>
  );
};
export default TestsDrawer;
