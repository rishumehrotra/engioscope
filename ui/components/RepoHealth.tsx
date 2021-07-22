import React, { Fragment } from 'react';
import { RepoAnalysis } from '../../shared/types';
import { num } from '../helpers';
import Card, { Tab } from './ExpandingCard';
import Metric from './Metric';

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
      <Metric name="Total" value={num(branches.total)} tooltip="Total number of branches in the repository" />
      <Metric name="Active" value={num(branches.active)} tooltip="Active development branches in-sync with master" />
      <Metric
        name="Abandoned"
        value={num(branches.abandoned)}
        tooltip="Inactive development branches which are out-of-sync with master, but contain commits which are not present on master"
      />
      <Metric
        name="Delete candidates"
        value={num(branches.deleteCandidates)}
        tooltip="Inactive development branches which are in-sync with master"
      />
      <Metric
        name="Possibly conflicting"
        value={num(branches.possiblyConflicting)}
        tooltip="Branches that are significantly out of sync with master"
      />
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

const tests = (tests: RepoAnalysis['tests']): Tab => ({
  title: 'Tests',
  count: tests?.total || 0,
  content: (
    <TabContents gridCols={5}>
      {tests ? tests.pipelines.map(pipeline => (
        <Fragment key={pipeline.name}>
          <Metric name="Build pipeline" value={pipeline.name} />
          <Metric name="Successful tests" value={pipeline.successful} />
          <Metric name="Failed tests" value={pipeline.failed} />
          <Metric name="Execution time" value={pipeline.executionTime} />
          <Metric name="Branch coverage" value={pipeline.coverage} />
        </Fragment>
      )) : (<div>This repo doesn't have any tests running in pipelines</div>)}
    </TabContents>
  )
});

const codeQuality = (codeQuality: RepoAnalysis['codeQuality']): Tab => ({
  title: 'Code quality',
  count: codeQuality?.qualityGate || 'unknown',
  content: (
    <TabContents>
      {codeQuality ? (
        <>
          <Metric name="Complexity" value={num(codeQuality.complexity)} />
          <Metric name="Bugs" value={num(codeQuality.bugs)} />
          <Metric name="Code smells" value={num(codeQuality.codeSmells)} />
          <Metric name="Vulnerabilities" value={num(codeQuality.vulnerabilities)} />
          <Metric name="Duplication" value={num(codeQuality.duplication)} />
          <Metric name="Tech debt" value={codeQuality.techDebt} />
          <Metric name="Quality gate" value={codeQuality.qualityGate} />
        </>
      ) : (<div>Couldn't find this repo on Sonar</div>)}
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
      tests(repo.tests),
      codeQuality(repo.codeQuality)
    ]}
  />
);

export default RepoHealth;
