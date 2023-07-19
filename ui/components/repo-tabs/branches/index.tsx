import React, { useMemo, useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { GitBranch } from 'react-feather';
import { twJoin } from 'tailwind-merge';
import type { RepoAnalysis } from '../../../../shared/types.js';
import type { Tab as TTab } from '../Tabs.jsx';
import BranchStats from './BranchStats.jsx';
import { trpc } from '../../../helpers/trpc.js';
import { useCollectionAndProject } from '../../../hooks/query-hooks.js';
import { HappyEmpty } from '../../repo-summary/Empty.jsx';
import { divide, toPercentage } from '../../../../shared/utils.js';
import { num } from '../../../helpers/utils.js';
import { TickCircle } from '../../common/Icons.jsx';

const NotShowingBranches: React.FC<{ limit?: number; count?: number }> = ({
  limit,
  count,
}) => {
  if (!limit || !count) return null;
  return count - limit > 0 ? (
    <p className="text-left text-sm italic text-gray-500 mt-2">
      {`* ${num(count - limit)} branches not shown`}
    </p>
  ) : null;
};

const Branches: React.FC<{
  defaultBranch: RepoAnalysis['defaultBranch'];
  repositoryId: string;
  repoUrl: string;
  branchesCount: number;
}> = ({ defaultBranch, repositoryId, repoUrl, branchesCount }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const cnp = useCollectionAndProject();

  const branchTotalCount = trpc.branches.getRepoBranchStats.useQuery({
    ...cnp,
    repositoryId,
  });

  const tabs = useMemo(
    () => [
      {
        label: 'Healthy branches',
        indicatorClassName: 'bg-theme-success-dim',
        key: 'healthy',
        count: branchTotalCount.data?.totalHealthy,
        // eslint-disable-next-line react/no-unstable-nested-components
        Component: () => {
          const healthyBranchesList = trpc.branches.getHealthyBranchesList.useQuery({
            ...cnp,
            repositoryId,
            repoUrl,
            limit: 20,
          });

          return (
            <>
              <div className="grid grid-cols-[1fr_20rem] gap-4">
                <div className="border rounded-md border-theme-seperator bg-theme-page-content overflow-hidden">
                  <BranchStats
                    branches={healthyBranchesList.data?.branches}
                    count={branchTotalCount.data?.totalHealthy}
                    branchType="healthy"
                  />
                </div>
                <div className="bg-theme-page-content border border-theme-seperator p-6 text-sm rounded-md">
                  <h3 className="font-medium text-base mb-6">
                    What is a healthy branch?
                  </h3>
                  <p>
                    A branch is considered to be healthy if all of the following
                    conditions are met.
                  </p>
                  <ul className="mt-4">
                    <li className="grid grid-cols-[min-content_1fr] gap-2 items-start mb-3">
                      <TickCircle className="block text-theme-success" size={22} />
                      It has a commit in the last 15 days.
                    </li>
                    <li className="grid grid-cols-[min-content_1fr] gap-2 items-start mb-3">
                      <TickCircle className="block text-theme-success" size={22} />
                      <div>
                        It is ahead of the <code>{defaultBranch}</code> branch by no more
                        than 10 commits.
                      </div>
                    </li>
                    <li className="grid grid-cols-[min-content_1fr] gap-2 items-start mb-3">
                      <TickCircle className="block text-theme-success" size={22} />
                      <div>
                        It is behind the <code>{defaultBranch}</code> branch by no more
                        than 10 commits.
                      </div>
                    </li>
                  </ul>
                  <div className="mt-1">
                    The <code>{defaultBranch}</code> branch is always considered to be
                    healthy.
                  </div>
                </div>
              </div>
              <NotShowingBranches
                count={branchTotalCount.data?.totalHealthy}
                limit={healthyBranchesList.data?.limit}
              />
            </>
          );
        },
      },
      {
        label: 'Delete candidates',
        indicatorClassName: 'bg-theme-tag',
        key: 'delete-candidates',
        count: branchTotalCount.data?.totalDelete,
        // eslint-disable-next-line react/no-unstable-nested-components
        Component: () => {
          const deleteCandidateBranchesList =
            trpc.branches.getDeleteCandidateBranchesList.useQuery({
              ...cnp,
              repositoryId,
              repoUrl,
              limit: 20,
            });

          return (
            <>
              <div className="grid grid-cols-[1fr_20rem] gap-4">
                <div className="border rounded-md border-theme-seperator bg-theme-page-content overflow-hidden">
                  <BranchStats
                    branches={deleteCandidateBranchesList.data?.branches}
                    count={branchTotalCount.data?.totalDelete}
                    branchType="delete"
                  />
                </div>
                <div className="bg-theme-page-content border border-theme-seperator p-6 text-sm rounded-md">
                  <h3 className="font-medium text-base mb-6">
                    What is a delete candidate?
                  </h3>
                  <p>
                    A branch is considered to be a delete candidate if all of the
                    following conditions are met.
                  </p>
                  <ul className="mt-4">
                    <li className="grid grid-cols-[min-content_1fr] gap-2 items-start mb-3">
                      <TickCircle className="block text-theme-success" size={22} />
                      <div>
                        All its commits are already merged into{' '}
                        <code>{defaultBranch}</code>.
                      </div>
                    </li>
                  </ul>
                  <div className="mt-1">
                    These branches can be deleted without any consequence.
                  </div>
                </div>
              </div>
              <NotShowingBranches
                count={branchTotalCount.data?.totalDelete}
                limit={deleteCandidateBranchesList.data?.limit}
              />
            </>
          );
        },
      },
      {
        label: 'Abandoned branches',
        key: 'abandoned-branches',
        indicatorClassName: 'bg-theme-warn',
        count: branchTotalCount.data?.totalAbandoned,
        // eslint-disable-next-line react/no-unstable-nested-components
        Component: () => {
          const abandonedBranchesList = trpc.branches.getAbandonedBranchesList.useQuery({
            ...cnp,
            repositoryId,
            repoUrl,
            limit: 20,
          });

          return (
            <>
              <div className="grid grid-cols-[1fr_20rem] gap-4">
                <div className="border rounded-md border-theme-seperator bg-theme-page-content overflow-hidden">
                  <BranchStats
                    branches={abandonedBranchesList.data?.branches}
                    count={branchTotalCount.data?.totalAbandoned}
                    branchType="abandoned"
                  />
                </div>
                <div className="bg-theme-page-content border border-theme-seperator p-6 text-sm rounded-md">
                  <h3 className="font-medium text-base mb-6">
                    What is an abandoned branch?
                  </h3>
                  <p>
                    A branch is considered to be abandoned if all of the following
                    conditions are met.
                  </p>
                  <ul className="mt-4">
                    <li className="grid grid-cols-[min-content_1fr] gap-2 items-start mb-3">
                      <TickCircle className="block text-theme-success" size={22} />
                      <div>
                        It is ahead of the <code>{defaultBranch}</code> by at least one
                        commit.
                      </div>
                    </li>
                    <li className="grid grid-cols-[min-content_1fr] gap-2 items-start mb-3">
                      <TickCircle className="block text-theme-success" size={22} />
                      <div>
                        There have been no commits to the branch in the last 15 days.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <NotShowingBranches
                count={branchTotalCount.data?.totalAbandoned}
                limit={abandonedBranchesList.data?.limit}
              />
            </>
          );
        },
      },
      {
        label: 'Unhealthy branches',
        key: 'Unhealthy',
        indicatorClassName: 'bg-theme-danger-dim',
        count: branchTotalCount.data?.totalUnhealthy,
        // eslint-disable-next-line react/no-unstable-nested-components
        Component: () => {
          const unhealthyBranchesList = trpc.branches.getUnhealthyBranchesList.useQuery({
            ...cnp,
            repositoryId,
            repoUrl,
            limit: 20,
          });

          return (
            <>
              <div className="grid grid-cols-[1fr_20rem] gap-4">
                <div className="border rounded-md border-theme-seperator bg-theme-page-content overflow-hidden">
                  <BranchStats
                    branches={unhealthyBranchesList.data?.branches}
                    count={branchTotalCount.data?.totalUnhealthy}
                    branchType="unhealthy"
                  />
                </div>

                <div className="bg-theme-page-content border border-theme-seperator p-6 text-sm rounded-md">
                  <h3 className="font-medium text-base mb-6">
                    What is an unhealthy branch?
                  </h3>
                  <p>
                    A branch is considered unhealthy if any of the following conditions
                    are met
                  </p>
                  <ul className="mt-4">
                    <li className="grid grid-cols-[min-content_1fr] gap-2 items-start mb-3">
                      <TickCircle className="block text-theme-success" size={22} />
                      <div>
                        It is behind the <code>{defaultBranch}</code> branch by 10 or more
                        commits.
                      </div>
                    </li>
                    <li className="grid grid-cols-[min-content_1fr] gap-2 items-start mb-3">
                      <TickCircle className="block text-theme-success" size={22} />
                      <div>
                        It is ahead of the <code>{defaultBranch}</code> branch by 10 or
                        more commits.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <NotShowingBranches
                count={branchTotalCount.data?.totalUnhealthy}
                limit={unhealthyBranchesList.data?.limit}
              />
            </>
          );
        },
      },
    ],
    [branchTotalCount.data, cnp, defaultBranch, repoUrl, repositoryId]
  );

  if (branchesCount === 0) {
    return (
      <div className="bg-theme-hover">
        <HappyEmpty
          heading="This repo is not initialised"
          body="Go build something cool"
        />
      </div>
    );
  }

  return (
    <Tabs
      className="grid grid-cols-[1fr_20rem] gap-4 justify-between p-6 bg-theme-hover"
      onSelect={setSelectedTab}
      defaultIndex={0}
    >
      <TabList className="flex gap-4">
        {tabs.map((tab, index) => (
          <Tab
            key={tab.key}
            className={twJoin(
              'py-3 px-4 border rounded-lg cursor-pointer',
              selectedTab === index
                ? 'border-theme-input-highlight bg-theme-page-content'
                : 'border-theme-seperator hover:bg-theme-page'
            )}
          >
            <h3 className="mb-1">{tab.label}</h3>
            <div className="flex gap-2 items-center font-medium text-sm">
              <span className="font-medium text-xl">{tab.count}</span>
              <span>
                <span
                  className={twJoin(
                    'inline-block px-1 rounded-md',
                    tab.indicatorClassName
                  )}
                >
                  {divide(tab.count || 0, branchesCount)
                    .map(toPercentage)
                    .getOr(0)}
                </span>
              </span>
            </div>
          </Tab>
        ))}
      </TabList>
      <div className="justify-self-end self-end">
        <a
          className="link-text text-sm inline-flex items-center font-medium"
          href={`${repoUrl}/branches?_a=all`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <GitBranch className="inline-block w-4 h-4 mr-1" />
          Manage branches
        </a>
      </div>
      <div className="col-span-2">
        {tabs.map(tab => (
          <TabPanel key={tab.key}>
            <tab.Component />
          </TabPanel>
        ))}
      </div>
    </Tabs>
  );
};

export default (
  defaultBranch: string,
  repositoryId: string,
  repoUrl: string,
  branchesCount?: number
): TTab => {
  return {
    title: 'Branches',
    count: branchesCount ?? 0,
    Component: () => {
      return (
        <Branches
          defaultBranch={defaultBranch.replace('refs/heads/', '')}
          repositoryId={repositoryId}
          repoUrl={repoUrl}
          branchesCount={branchesCount || 0}
        />
      );
    },
  };
};
