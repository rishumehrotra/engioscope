import React from 'react';
import { RepoAnalysis } from '../../shared/types';
import { num, shortDate } from '../helpers';
import AlertMessage from './AlertMessage';
import Card, { Tab } from './ExpandingCard';
import Flair from './Flair';
import Metric from './Metric';

const repoSubtitle = (languages: RepoAnalysis['languages']) => {
  if (!languages) return;

  const totalLoc = languages.reduce((acc, lang) => acc + lang.loc, 0);

  return [...languages]
    .sort((a, b) => b.loc - a.loc)
    .map(l => (
      <Flair
        key={l.lang}
        flairColor={l.color}
        title={`${num(l.loc)} lines of code`}
        label={`${Math.round((l.loc * 100) / totalLoc)}% ${l.lang}`}
      />
    ));
};

const TabContents: React.FC<{ gridCols?: number }> = ({ gridCols = 5, children }) => {
  const colsClassName = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9'
  } as const;

  return (
    <div
      className={
        `${gridCols === 0 ? '' : `grid ${colsClassName[gridCols as keyof typeof colsClassName]} gap-4`} p-6 py-6 rounded-lg bg-gray-100`
      }
    >
      {children}
    </div>
  );
};

const builds = (builds: RepoAnalysis['builds']): Tab => ({
  title: 'Builds',
  count: builds?.count || 0,
  content: (
    <TabContents gridCols={1}>
      {builds
        ? (
          <>
            <table className="table-auto text-center divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider"> </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Successful</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Runs</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Success rate</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Average duration</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Current status</th>
                </tr>
              </thead>
              <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
                {builds.pipelines.map(pipeline => (
                  <tr key={pipeline.name}>
                    <td className="pl-6 py-4 whitespace-nowrap text-blue-600 text-left">
                      <a href={pipeline.url} target="_blank" rel="noreferrer">
                        <p className="truncate w-36">
                          {pipeline.name}
                        </p>
                      </a>
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
                      {pipeline.status.type !== 'failed' && (
                        <span className="capitalize">{pipeline.status.type}</span>
                      )}
                      {pipeline.status.type === 'failed'
                        ? `Failing since ${shortDate(new Date(pipeline.status.since))}`
                        : undefined}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="w-full text-right text-sm italic text-gray-700">
              <span>* the data shown is for last 30 days</span>
            </div>
          </>
        )
        : (
          <TabContents gridCols={1}>
            <AlertMessage message="No builds for this repo in the last month" />
          </TabContents>
        )}
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
    <TabContents gridCols={1}>
      {tests ? (
        <>
          <table className="table-auto text-center divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider"> </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Successful</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Failed</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Execution time</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Branch coverage</th>
              </tr>
            </thead>
            <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
              {tests.pipelines.map(pipeline => (
                <tr key={pipeline.name}>
                  <td className="pl-6 py-4 whitespace-nowrap text-blue-600 text-left">
                    <a href={pipeline.url} target="_blank" rel="noreferrer">
                      <p className="truncate w-36">
                        {pipeline.name}
                      </p>
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{pipeline.successful}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{num(pipeline.failed)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{pipeline.executionTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{pipeline.coverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="w-full text-right text-sm italic text-gray-700">
            <span>* the data shown is for the most recent test run, if it occurred in the last 30 days</span>
          </div>
        </>
      ) : (
        <TabContents gridCols={1}>
          <AlertMessage message="This repo didn't have any tests running in pipelines in the last month" />
        </TabContents>
      )}
    </TabContents>
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
    ) : (<TabContents gridCols={0}><AlertMessage message="Couldn't find this repo on SonarQube" /></TabContents>)
  )
});

const RepoHealth: React.FC<{repo:RepoAnalysis}> = ({ repo }) => (
  <Card
    title={repo.name}
    titleUrl={repo.url}
    subtitle={repoSubtitle(repo.languages)}
    tag={repo.commits.count === 0 ? 'Inactive' : undefined}
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
