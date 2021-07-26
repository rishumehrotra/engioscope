import React, { ImgHTMLAttributes, useState } from 'react';
import { add } from 'rambda';
import { RepoAnalysis } from '../../shared/types';
import { num, shortDate } from '../helpers';
import AlertMessage from './AlertMessage';
import Card, { Tab } from './ExpandingCard';
import Flair from './Flair';
import Metric from './Metric';
import CommitTimeline from './CommitTimeline';
import defaultProfilePic from '../default-profile-pic.png';

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
        `${gridCols === 0 ? '' : `grid ${colsClassName[gridCols as keyof typeof colsClassName]}`} p-6 py-6 rounded-lg bg-gray-100`
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
                  <th className="pl-6 pr-0 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Success rate</th>
                  <th className="pr-6 pl-0 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-right">Average duration</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-left">Current status</th>
                </tr>
              </thead>
              <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
                {builds.pipelines.map(pipeline => (
                  <tr key={pipeline.name}>
                    <td className="pl-6 py-4 whitespace-nowrap text-left">
                      <a href={pipeline.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        <p className="truncate w-36">
                          {pipeline.name}
                        </p>
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{pipeline.success}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{num(pipeline.count)}</td>
                    <td className="pl-6 pr-0 py-4 whitespace-nowrap">{`${Math.round((pipeline.success * 100) / pipeline.count)}%`}</td>
                    <td className="pr-6 pl-0 py-4 whitespace-nowrap text-right">
                      <span className="text-bold">{pipeline.duration.average}</span>
                      <div className="text-gray-400 text-sm">
                        (
                        {`${pipeline.duration.min} - ${pipeline.duration.max}`}
                        )
                      </div>

                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      {pipeline.status.type !== 'failed' && (
                        <>
                          <span className="bg-green-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
                          <span className="capitalize">{pipeline.status.type}</span>
                        </>
                      )}
                      {pipeline.status.type === 'failed'
                        ? (
                          <>
                            <span className="bg-red-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
                            <span>{`Failing since ${shortDate(new Date(pipeline.status.since))}`}</span>
                          </>
                        ) : undefined}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="w-full text-right text-sm italic text-gray-500 mt-4">
              <span>* Data shown is for the last 30 days</span>
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
      <Metric name="Total" value={num(branches.total)} tooltip="Total number of branches in the repository" position="first" />
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
        position="last"
      />
    </TabContents>
  )
});

const ProfilePic: React.FC<ImgHTMLAttributes<HTMLImageElement>> = ({ src, ...rest }) => {
  const [actualSrc, setActualSrc] = useState(src || defaultProfilePic);
  const onError = () => {
    console.log('onError called');
    setActualSrc(defaultProfilePic);
  };

  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={actualSrc} onError={onError} {...rest} />;
};

const commits = (commits: RepoAnalysis['commits']): Tab => {
  const max = Math.max(...Object.values(commits.byDev).flatMap(d => Object.values(d.byDate)));
  return {
    title: 'Commits',
    count: commits.count,
    content: (
      <TabContents gridCols={1}>
        {commits.count === 0
          ? (
            <AlertMessage message="No commits to this repo in the last month" />
          )
          : (
            <>
              <table className="table-auto text-center divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider"> </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Commits</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider" colSpan={3}>Changes</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Timeline</th>
                  </tr>
                </thead>
                <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
                  {commits.byDev.map(commitsByDev => (
                    <tr key={commitsByDev.name}>
                      <td className="px-6 py-4 text-left capitalize">
                        <ProfilePic
                          alt={`Profile pic for ${commitsByDev.name}`}
                          src={commitsByDev.imageUrl}
                          width="44"
                          height="44"
                          className="rounded-full inline-block mr-2"
                        />
                        {commitsByDev.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {Object.values(commitsByDev.byDate).reduce(add, 0)}
                      </td>
                      <td
                        title={`Added ${num(commitsByDev.changes.add)} files`}
                        className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-green-700"
                      >
                        {commitsByDev.changes.add
                          ? `+${num(commitsByDev.changes.add)}`
                          : ''}
                      </td>
                      <td
                        title={`Modified ${num(commitsByDev.changes.edit)} files`}
                        className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-400"
                      >
                        {commitsByDev.changes.edit
                          ? `~${num(commitsByDev.changes.edit)}`
                          : ''}
                      </td>
                      <td
                        title={`Deleted code in ${num(commitsByDev.changes.delete)} files`}
                        className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-700"
                      >
                        {commitsByDev.changes.delete
                          ? `-${num(commitsByDev.changes.delete)}`
                          : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <CommitTimeline
                          timeline={commitsByDev.byDate}
                          max={max}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="w-full text-right text-sm italic text-gray-500 mt-4">
                <span>* Data shown is for the last 30 days, not including merge commits</span>
              </div>
            </>
          )}
      </TabContents>
    )
  };
};

const prs = (prs: RepoAnalysis['prs']): Tab => ({
  title: 'Pull requests',
  count: prs.total,
  content: (
    <TabContents gridCols={4}>
      <Metric name="Active" value={num(prs.active)} position="first" />
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
          position="last"
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
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                  <span className="bg-green-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
                  Successful
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                  <span className="bg-red-500 w-2 h-2 rounded-full inline-block mr-2"> </span>
                  Failed
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Execution time</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Branch coverage</th>
              </tr>
            </thead>
            <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
              {tests.pipelines.map(pipeline => (
                <tr key={pipeline.name}>
                  <td className="pl-6 py-4 whitespace-nowrap text-left">
                    <a href={pipeline.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      <p className="truncate w-36">
                        {pipeline.name}
                      </p>
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{num(pipeline.successful)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{num(pipeline.failed)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{pipeline.executionTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{pipeline.coverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="w-full text-right text-sm italic text-gray-500 mt-4">
            <span>* Data shown is for the most recent test run, if it occurred in the last 30 days</span>
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
      <TabContents gridCols={7}>
        <Metric name="Complexity" value={num(codeQuality.complexity)} position="first" />
        <Metric name="Bugs" value={num(codeQuality.bugs)} />
        <Metric name="Code smells" value={num(codeQuality.codeSmells)} />
        <Metric name="Vulnerabilities" value={num(codeQuality.vulnerabilities)} />
        <Metric name="Duplication" value={num(codeQuality.duplication)} />
        <Metric name="Tech debt" value={codeQuality.techDebt} />
        <Metric name="Quality gate" value={codeQuality.qualityGate} position="last" />
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
      commits(repo.commits),
      prs(repo.prs),
      tests(repo.tests),
      codeQuality(repo.codeQuality)
    ]}
  />
);

export default RepoHealth;
