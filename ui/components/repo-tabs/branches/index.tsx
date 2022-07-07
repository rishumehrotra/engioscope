import React, { useState } from 'react';
import type { RepoAnalysis } from '../../../../shared/types';
import type { Tab } from '../Tabs';
import { num } from '../../../helpers/utils';
import BranchStats from './BranchStats';
import BranchTab from '../branches/BranchTab';
import TabContents from '../TabContents';
import AlertMessage from '../../common/AlertMessage';

const Branches: React.FC<{
  branchStats: RepoAnalysis['branches'];
  defaultBranch: RepoAnalysis['defaultBranch'];
}> = ({
  branchStats,
  defaultBranch
}) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [{
    label: 'Healthy',
    count: num(branchStats.healthy.count),
    component: () => (
      <>
        <div className="bg-gray-50 border-slate-300 border mt-3 px-4 py-2 text-sm">
          A branch is considered to be healthy if all of the following conditions are met.
          <ul className="list-disc px-4">
            <li>It has a commit in the last 15 days</li>
            <li>It doesn't have more than 10 commits</li>
            <li>
              It isn't behind the
              {' '}
              <code>{defaultBranch}</code>
              {' '}
              branch by more than 10 commits
            </li>
          </ul>
          The
          {' '}
          <code>{defaultBranch}</code>
          {' '}
          branch is always considered to be healthy.
        </div>
        <BranchStats defaultBranch={defaultBranch} branchStats={branchStats.healthy} />
      </>
    )
  }, {
    label: 'Unhealthy',
    count: num(branchStats.unhealthy.count),
    component: () => (
      <BranchStats defaultBranch={defaultBranch} branchStats={branchStats.unhealthy} />
    )
  }];

  return (
    <TabContents gridCols={1}>
      {
        branchStats.total
          ? (
            <>
              <div className="grid-cols-1">
                {
                  tabs.map((tab, index) => (
                    <BranchTab
                      key={tab.label}
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
