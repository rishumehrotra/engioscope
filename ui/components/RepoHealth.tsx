import React from 'react';
import { RepoAnalysis } from '../../shared/types';
import { num } from '../helpers';
import Card, { Tab } from './ExpandingCard';
import Metric from './Metric';
import RepoHealthDetails from './RepoHealthDetails';

const repoSubtitle = (languages: Record<string, string> | undefined) => (languages
  ? [
    Object.keys(languages)[0],
    `(${Object.values(languages)[0]})`
  ].join(' ')
  : undefined);

const TabContents: React.FC<{ gridCols?: number }> = ({ gridCols, children }) => (
  <div className={`grid ${gridCols === 6 ? 'grid-cols-6' : 'grid-cols-5'} gap-4 p-6 py-6 rounded-lg bg-gray-100`}>
    {children}
  </div>
);

const builds = (builds: RepoAnalysis['builds']): Tab => ({
  title: 'Builds',
  count: builds?.count || 0,
  content: (
    <TabContents>
      {builds
        ? (
          <>
            <Metric name="Total successful" value={num(builds.success)} />
            <Metric name="Number of executions" value={num(builds.count)} />
            <Metric name="Success rate" value={`${Math.round((builds.success * 100) / builds.count)}%`} />
            <Metric
              name="Average duration"
              value={builds.duration.average}
              additionalValue={`${builds.duration.min} - ${builds.duration.max}`}
            />
            <Metric
              name="Current status"
              value={builds.status.type}
              additionalValue={builds.status.type === 'failed' ? builds.status.since : undefined}
            />
          </>
        )
        : (<div>No builds for this repo</div>)}
    </TabContents>
  )
});

const branches = (branches: RepoAnalysis['branches']): Tab => ({
  title: 'Branches',
  count: branches.total,
  content: (
    <TabContents>
      <Metric name="Total" value={num(branches.total)} />
      <Metric name="Active" value={num(branches.active)} />
      <Metric name="Abandoned" value={num(branches.abandoned)} />
      <Metric name="Delete candidates" value={num(branches.deleteCandidates)} />
      <Metric name="Possibly conflicting" value={num(branches.possiblyConflicting)} />
    </TabContents>
  )
});

const prs = (prs: RepoAnalysis['prs']): Tab => ({
  title: 'Pull requests',
  count: prs.total,
  content: (
    <TabContents>
      <Metric name="Active" value={num(prs.active)} />
      <Metric name="Abandoned" value={num(prs.abandoned)} />
      <Metric name="Completed" value={num(prs.completed)} />
      {prs.timeToApprove ? (
        <Metric
          name="Time to approve"
          value={prs.timeToApprove.average}
          additionalValue={`${prs.timeToApprove.min} - ${prs.timeToApprove.max}`}
        />
      ) : (
        <Metric
          name="Time to approve"
          value="-"
        />
      )}
    </TabContents>
  )
});

const RepoHealth: React.FC<{repo:RepoAnalysis}> = ({ repo }) => (
  <Card
    title={repo.name}
    subtitle={repoSubtitle(repo.languages)}
    tabs={[
      builds(repo.builds),
      branches(repo.branches),
      prs(repo.prs),
      ...repo.indicators.map(indicator => ({
        title: indicator.name,
        count: indicator.count,
        content: <RepoHealthDetails
          indicators={indicator.indicators}
          gridCols={5}
        />
      }))
    ]}
  />
);

export default RepoHealth;
