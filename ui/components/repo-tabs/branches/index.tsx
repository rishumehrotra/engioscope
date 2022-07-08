import React, { useState } from 'react';
import type { RepoAnalysis } from '../../../../shared/types';
import type { Tab } from '../Tabs';
import { num } from '../../../helpers/utils';
import BranchStats from './BranchStats';
import BranchTab from '../branches/BranchTab';
import TabContents from '../TabContents';
import AlertMessage from '../../common/AlertMessage';
import { Branches as BranchesIcon } from '../../common/Icons';

const Branches: React.FC<{
  branchStats: RepoAnalysis['branches'];
  defaultBranch: RepoAnalysis['defaultBranch'];
}> = ({
  branchStats,
  defaultBranch
}) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [{
    label: (
      <>
        <span className="w-2 h-2 bg-green-500 inline-block mr-1.5 rounded-full" />
        Healthy
      </>
    ),
    key: 'healthy',
    count: num(branchStats.healthy.count),
    // eslint-disable-next-line react/no-unstable-nested-components
    component: () => (
      <>
        <div className="bg-gray-50 border-slate-300 border mt-3 px-4 py-2 text-sm rounded-md">
          A branch is considered to be healthy if
          {' '}
          <strong>all</strong>
          {' '}
          of the following conditions are met.
          <ul className="list-disc px-4">
            <li>
              It
              {' '}
              <strong>has</strong>
              {' '}
              a commit in the last 15 days.
            </li>
            <li>
              It is
              {' '}
              ahead of the
              {' '}
              <code>{defaultBranch}</code>
              {' '}
              branch by
              {' '}
              <strong>no more</strong>
              {' '}
              than 10 commits
            </li>
            <li>
              It is
              {' '}
              behind the
              {' '}
              <code>{defaultBranch}</code>
              {' '}
              branch by
              {' '}
              <strong>no more</strong>
              {' '}
              than 10 commits
            </li>
          </ul>
          <div className="mt-1">
            The
            {' '}
            <code>{defaultBranch}</code>
            {' '}
            branch is always considered to be healthy.
          </div>
        </div>
        <BranchStats branchStats={branchStats.healthy} />
      </>
    )
  }, {
    label: (
      <>
        <span className="w-2 h-2 bg-red-500 inline-block mr-1.5 rounded-full" />
        Unhealthy
      </>
    ),
    key: 'Unhealthy',
    count: num(branchStats.unhealthy.count),
    // eslint-disable-next-line react/no-unstable-nested-components
    component: () => (
      <>
        <div className="bg-gray-50 border-slate-300 border mt-3 px-4 py-2 text-sm rounded-md">
          A branch is considered to be unhealthy if
          {' '}
          <strong>any</strong>
          {' '}
          of the following conditions are met.
          <ul className="list-disc px-4">
            <li>
              It
              {' '}
              <strong>does not have</strong>
              {' '}
              a commit in the last 15 days.
            </li>
            <li>
              It is
              {' '}
              ahead of the
              {' '}
              <code>{defaultBranch}</code>
              {' '}
              branch by
              {' '}
              <strong>more</strong>
              {' '}
              than 10 commits.
            </li>
            <li>
              It is
              {' '}
              behind the
              {' '}
              <code>{defaultBranch}</code>
              {' '}
              branch by
              {' '}
              <strong>more</strong>
              {' '}
              than 10 commits.
            </li>
          </ul>
          <div className="mt-1">
            The
            {' '}
            <code>{defaultBranch}</code>
            {' '}
            branch is always considered to be healthy.
          </div>
        </div>

        <BranchStats branchStats={branchStats.unhealthy} />
      </>
    )
  }];

  return (
    <TabContents gridCols={1}>
      {
        branchStats.total
          ? (
            <>
              <div className="grid justify-between grid-cols-2">
                <div>
                  {
                    tabs.map((tab, index) => (
                      <BranchTab
                        key={tab.key}
                        isSelected={index === selectedTab}
                        onToggleSelect={() => {
                          setSelectedTab(index);
                        }}
                        count={tab.count}
                        label={tab.label}
                      />
                    ))
                  }
                </div>
                <div className="justify-self-end self-end">
                  <a
                    className="link-text text-sm inline-flex items-center"
                    href={branchStats.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BranchesIcon className="inline-block w-4 h-4 mr-1" />
                    Manage branches
                  </a>
                </div>
              </div>
              { tabs[selectedTab].component() }
            </>
          )
          : <AlertMessage message="No branches in this repo" />
      }
    </TabContents>
  );
};

export default (branches: RepoAnalysis['branches'], defaultBranch: RepoAnalysis['defaultBranch']): Tab => ({
  title: 'Branches',
  count: branches.total,
  content: () => (<Branches branchStats={branches} defaultBranch={defaultBranch} />)
});
