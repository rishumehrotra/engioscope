import React, { Fragment } from 'react';
import { RepoAnalysis } from '../../shared/types';
import { num } from '../helpers';
import AlertMessage from './AlertMessage';
import Card, { Tab } from './ExpandingCard';
import Metric from './Metric';

const repoSubtitle = (languages: RepoAnalysis['languages']) => {
  if (!languages) return;

  const totalLoc = languages.reduce((acc, lang) => acc + lang.loc, 0);

  return [...languages]
    .sort((a, b) => b.loc - a.loc)
    .map(l => (
      <span
        key={l.lang}
        className="text-sm rounded-full py-1 px-2 mr-2 bg-gray-100 text-gray-900"
        title={`${num(l.loc)} lines of code`}
      >
        <span className="rounded-full w-3 h-3 inline-block" style={{ backgroundColor: l.color }}> </span>
        {' '}
        {`${Math.round((l.loc * 100) / totalLoc)}%`}
        {' '}
        {l.lang}
      </span>
    ));
};

const TabContents: React.FC<{ gridCols?: number }> = ({ gridCols = 5, children }) => (
  <div className={`${gridCols === 0 ? '' : `grid grid-cols-${gridCols}`} gap-4 : ''}
   p-6 py-6 rounded-lg bg-gray-100`}
  >
    {children}
  </div>
);

const builds = (builds: RepoAnalysis['builds']): Tab => ({
  title: 'Builds',
  count: builds?.count || 0,
  content: (
    <TabContents gridCols={1}>
      {builds
        ? (
          <table className="table-auto text-center divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" />
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Successful</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Runs</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Success rate</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Average duration</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Current status</th>
              </tr>
            </thead>
            <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
              {builds.pipelines.map(pipeline => (
                <tr key={pipeline.name}>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-600 text-left">
                    <a href={pipeline.url} target="_blank" rel="noreferrer">{pipeline.name}</a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{pipeline.success}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{num(pipeline.count)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{`${Math.round((pipeline.success * 100) / pipeline.count)}%`}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-bold">{pipeline.duration.average}</span>
                    <div>
                      (
                      {`${pipeline.duration.min} - ${pipeline.duration.max}`}
                      )
                    </div>

                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize">{pipeline.status.type}</span>
                    {pipeline.status.type === 'failed' ? ` since ${pipeline.status.since}` : undefined}
                  </td>
                </tr>

              ))}
            </tbody>
          </table>
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
    <div>
      {tests ? (
        <TabContents gridCols={5}>
          {tests.pipelines.map(pipeline => (
            <Fragment key={pipeline.name}>
              <Metric name="Build pipeline" url={pipeline.url} value={pipeline.name} />
              <Metric name="Successful tests" value={pipeline.successful} />
              <Metric name="Failed tests" value={pipeline.failed} />
              <Metric name="Execution time" value={pipeline.executionTime} />
              <Metric name="Branch coverage" value={pipeline.coverage} />
            </Fragment>
          ))}
        </TabContents>
      ) : (
        <TabContents gridCols={0}>
          <AlertMessage message="This repo doesn't have any tests running in pipelines" />
        </TabContents>
      )}
    </div>
  )
});

const codeQuality = (codeQuality: RepoAnalysis['codeQuality']): Tab => ({
  title: 'Code quality',
  count: codeQuality?.qualityGate || 'unknown',
  content: (
    codeQuality ? (
      <TabContents>
        <Metric name="Complexity" value={num(codeQuality.complexity)} />
        <Metric name="Bugs" value={num(codeQuality.bugs)} />
        <Metric name="Code smells" value={num(codeQuality.codeSmells)} />
        <Metric name="Vulnerabilities" value={num(codeQuality.vulnerabilities)} />
        <Metric name="Duplication" value={num(codeQuality.duplication)} />
        <Metric name="Tech debt" value={codeQuality.techDebt} />
        <Metric name="Quality gate" value={codeQuality.qualityGate} />
      </TabContents>
    ) : (<TabContents gridCols={0}><AlertMessage message="Couldn't find this repo on Sonar" /></TabContents>)
  )
});

const RepoHealth: React.FC<{repo:RepoAnalysis}> = ({ repo }) => (
  <Card
    title={repo.name}
    titleUrl={repo.url}
    subtitle={repoSubtitle(repo.languages)}
    tag={repo.commits === 0 ? 'Inactive' : undefined}
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
