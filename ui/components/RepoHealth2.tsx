import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { byNum, desc } from 'sort-lib';
import { compose, not, prop } from 'rambda';
import { twJoin, twMerge } from 'tailwind-merge';
import { Code, GitBranch, GitPullRequest } from 'react-feather';
import { Tooltip } from 'react-tooltip';
import prettyMilliseconds from 'pretty-ms';
import { combinedQualityGate, num, pluralise } from '../helpers/utils.js';
import builds from './repo-tabs/builds.jsx';
import tests from './repo-tabs/tests.jsx';
import codeQuality from './repo-tabs/codeQuality.jsx';
import type { Tab } from './repo-tabs/Tabs.jsx';
import { useSortParams } from '../hooks/sort-hooks.js';
import branches from './repo-tabs/branches/index.jsx';
import { trpc, type RouterClient } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import { ReleasePipeline } from './common/Icons.jsx';
import useUiConfig from '../hooks/use-ui-config.js';
import { useQueryContext } from '../hooks/query-hooks.js';

type ReleaseBranchesProps = {
  repositoryId: string;
  defaultBranch: string | undefined;
  branches: {
    name: string;
    conforms: boolean | undefined;
  }[];
};

const ReleaseBranches: React.FC<ReleaseBranchesProps> = ({
  branches,
  repositoryId,
  defaultBranch,
}) => {
  const conformanceRatio = useMemo(() => {
    return divide(branches.filter(prop('conforms')).length, branches.length);
  }, [branches]);

  const branchesThatConform = useMemo(() => {
    return branches
      .filter(prop('conforms'))
      .sort(desc(byNum(b => (b.name === defaultBranch ? 1 : 0))));
  }, [branches, defaultBranch]);

  const branchesThatDontConform = useMemo(() => {
    return branches
      .filter(compose(not, prop('conforms')))
      .sort(desc(byNum(b => (b.name === defaultBranch ? 1 : 0))));
  }, [branches, defaultBranch]);

  if (!branches.length) return null;

  return (
    <>
      <div
        className={twJoin(
          'text-sm px-2 rounded-sm cursor-default',
          conformanceRatio.getOr(0) === 1 ? 'bg-theme-success-dim' : 'bg-theme-danger-dim'
        )}
        data-tooltip-id={`${repositoryId}-conformance`}
      >
        {conformanceRatio.map(toPercentage).getOr('-')}
      </div>
      <Tooltip
        id={`${repositoryId}-conformance`}
        place="top-start"
        style={{
          backgroundColor: 'rgba(var(--color-bg-page-content), 1)',
          color: 'rgba(var(--color-text-base), 1)',
          padding: '0',
        }}
        opacity={1}
        className="shadow-md border border-theme-seperator max-w-md"
      >
        <div className="px-4 py-3">
          {branchesThatConform.length ? (
            <>
              <h3 className="font-medium mb-2">
                Release branches conforming to branch policies
              </h3>
              <ul>
                {branchesThatConform.map(b => (
                  <li
                    className="inline-block bg-theme-success-dim px-2 rounded mb-2 mr-2 text-sm"
                    key={b.name}
                  >
                    {b.name.replace('refs/heads/', '')}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {branchesThatDontConform.length ? (
            <>
              <h3
                className={twJoin(
                  'font-medium mb-2',
                  branchesThatConform.length && 'mt-1'
                )}
              >
                Release branches not conforming to branch policies
              </h3>
              <ul>
                {branchesThatDontConform.map(b => (
                  <li
                    className="inline-block bg-theme-tag px-2 rounded mb-2 mr-2 text-sm"
                    key={b.name}
                  >
                    {b.name.replace('refs/heads/', '')}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Tooltip>
    </>
  );
};

type LanguagesProps = {
  qualityGateStatus: RouterClient['repos']['getFilteredAndSortedReposWithStats']['items'][number]['sonarQualityGateStatuses'];
  className?: string;
};

const Languages = ({ qualityGateStatus, className }: LanguagesProps) => {
  const uiConfig = useUiConfig();

  if (!uiConfig.hasSonar) return null;

  return (
    <div
      className={twMerge('grid grid-cols-[min-content_1fr] items-start gap-2', className)}
    >
      <Code size={18} className="mt-1 text-theme-icon" />
      {qualityGateStatus?.language ? (
        qualityGateStatus.language.stats.length === 0 ? (
          <span className="text-theme-helptext">
            Couldn't get language details from SonarQube
          </span>
        ) : (
          <ul className="flex gap-4">
            {qualityGateStatus.language.stats.map(l => (
              <li
                key={l.lang}
                data-tooltip-id="react-tooltip"
                data-tooltip-content={`${num(l.loc)} lines of code`}
                className="flex gap-2 items-center"
              >
                <span
                  className="rounded-full w-3 h-3 inline-block"
                  style={{ backgroundColor: l.color }}
                />
                <span>
                  {l.lang}{' '}
                  <span className="text-theme-helptext">
                    {divide(
                      l.loc,
                      !qualityGateStatus || qualityGateStatus?.language === null
                        ? 0
                        : qualityGateStatus.language.ncloc || 0
                    )
                      .map(toPercentage)
                      .getOr('-')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <span className="text-theme-helptext">
          Configure SonarQube to get more details
        </span>
      )}
    </div>
  );
};

type PRsProps = {
  isInactive: boolean;
  prCount: number;
  repositoryId: string;
};

const PRs = ({ isInactive, prCount, repositoryId }: PRsProps) => {
  const [isTooltipTriggered, setIsTooltipTriggered] = useState(false);
  const pullRequest = trpc.pullRequests.getPullRequestsSummaryForRepo.useQuery(
    {
      queryContext: useQueryContext(),
      repositoryId,
    },
    { enabled: prCount !== 0 && isTooltipTriggered }
  );
  const [queryPeriodDays] = useQueryPeriodDays();

  if (isInactive) return null;
  return (
    <>
      <GitPullRequest size={18} className="text-theme-icon" />
      <span
        onMouseOver={() => setIsTooltipTriggered(true)}
        onFocus={() => setIsTooltipTriggered(true)}
        data-tooltip-id={`${repositoryId}-pr`}
        className="cursor-default"
      >
        {prCount}
      </span>
      <Tooltip
        id={`${repositoryId}-pr`}
        place="top-start"
        style={{
          backgroundColor: 'rgba(var(--color-bg-page-content), 1)',
          color: 'rgba(var(--color-text-base), 1)',
          padding: '0',
        }}
        opacity={1}
        className="shadow-md border border-theme-seperator max-w-md"
      >
        <div className="px-4 py-3">
          {prCount === 0 ? (
            `No pull requests raised in the last ${queryPeriodDays} days`
          ) : (
            <ul className="grid grid-cols-2 gap-4">
              <li>
                <h3 className="text-sm">Active</h3>
                <div className="font-medium">{pullRequest.data?.active ?? '...'}</div>
              </li>
              <li>
                <h3 className="text-sm">Abandoned</h3>
                <div className="font-medium">{pullRequest.data?.abandoned ?? '...'}</div>
              </li>
              <li>
                <h3 className="text-sm">Completed</h3>
                <div className="font-medium">{pullRequest.data?.completed ?? '...'}</div>
              </li>
              <li>
                <h3 className="text-sm">Time to approve</h3>
                <div className="font-medium">
                  {pullRequest.data?.avgTime
                    ? prettyMilliseconds(pullRequest.data.avgTime, { unitCount: 2 })
                    : '...'}
                </div>
              </li>
            </ul>
          )}
        </div>
      </Tooltip>
    </>
  );
};

type RepoHealthProps = {
  item: RouterClient['repos']['getFilteredAndSortedReposWithStats']['items'][number];
  index: number;
};

const RepoHealth2: React.FC<RepoHealthProps> = ({ item, index }) => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const location = useLocation();
  const uiConfig = useUiConfig();
  const isFirst = index === 0;
  const isInactive = useMemo(
    () => item.builds === 0 && item.commits === 0,
    [item.builds, item.commits]
  );

  const tabs = useMemo(
    () => [
      builds(item.repositoryId, item.builds),
      branches(
        item.repoDetails.defaultBranch || 'master',
        item.repositoryId,
        item.repoDetails.url || '',
        item.branches
      ),
      tests(item.repositoryId, queryPeriodDays, item.tests),
      ...(uiConfig.hasSonar
        ? [
            codeQuality(
              item.repositoryId,
              item.repoDetails.name,
              item.repoDetails.defaultBranch || 'master',
              combinedQualityGate(item.sonarQualityGateStatuses?.status || [])
            ),
          ]
        : []),
    ],
    [
      item.repositoryId,
      item.builds,
      item.repoDetails.defaultBranch,
      item.repoDetails.url,
      item.repoDetails.name,
      item.branches,
      item.tests,
      item.sonarQualityGateStatuses?.status,
      queryPeriodDays,
      uiConfig.hasSonar,
    ]
  );

  const [{ sortBy }] = useSortParams();
  const [selectedTab, setSelectedTab] = useState<Tab | null>(isFirst ? tabs[0] : null);

  useEffect(() => {
    if (sortBy) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return setSelectedTab(isFirst ? tabs.find(t => t.title === sortBy)! : null);
    }
    return setSelectedTab(isFirst ? tabs[0] : null);
  }, [sortBy, tabs, isFirst]);

  const pipelinesUrl = location.pathname.replace(
    '/repos',
    `/release-pipelines?search=repo:"${item.repoDetails.name}"`
  );
  const isExpanded = selectedTab !== null;

  return (
    <div
      className={twJoin(
        'bg-theme-page-content rounded shadow-sm mb-4 border border-theme-seperator overflow-hidden',
        'group',
        isInactive && 'opacity-60'
      )}
    >
      <div className="grid grid-flow-col p-6 items-stretch">
        <div>
          <h2 className="inline-flex items-center gap-2 mb-2">
            <a
              href={item.repoDetails.url}
              target="_blank"
              rel="noreferrer"
              className={twJoin(
                'font-medium text-lg truncate max-w-full',
                'group-hover:text-theme-highlight hover:underline',
                isExpanded && 'text-theme-highlight'
              )}
            >
              {item.repoDetails.name}
            </a>
            <span className="inline-flex items-center gap-2 text-theme-icon">
              {item.repoDetails.defaultBranch ? (
                <>
                  <GitBranch size={16} />
                  {item.repoDetails.defaultBranch.replace('refs/heads/', '')}
                </>
              ) : (
                'Not initialised'
              )}
            </span>
          </h2>

          <Languages qualityGateStatus={item.sonarQualityGateStatuses} className="mb-2" />

          <div className="flex items-center gap-2">
            <ReleasePipeline size={18} className="text-theme-icon" />
            {item.pipelineCounts ? (
              <Link
                to={pipelinesUrl}
                className={twJoin(
                  'group-hover:text-theme-highlight hover:underline',
                  isExpanded && 'text-theme-highlight'
                )}
              >
                {`${pluralise(
                  item.pipelineCounts,
                  'release pipeline',
                  'release pipelines'
                )}`}{' '}
              </Link>
            ) : (
              '0 release pipelines'
            )}
            {item.releaseBranches ? (
              <ReleaseBranches
                repositoryId={item.repoDetails.id}
                defaultBranch={item.repoDetails.defaultBranch}
                branches={item.releaseBranches}
              />
            ) : null}

            <PRs
              isInactive={isInactive}
              prCount={item.pullRequests}
              repositoryId={item.repositoryId}
            />
          </div>

          {isInactive ? (
            <div
              className="text-theme-warn bg-theme-warn text-xs inline-block py-1 px-2 rounded-md"
              data-tooltip-id="react-tooltip"
              data-tooltip-html={`This repository doesn't count towards stats,<br />
          as it hasn't seen any commits or builds in the last ${queryPeriodDays} days.`}
            >
              Inactive
            </div>
          ) : null}
        </div>
        <div>{/* Commits graph comes here */}</div>
      </div>

      <div className="grid grid-cols-[max-content_max-content] justify-between border-t border-theme-seperator items-center">
        <ul className="inline-grid grid-flow-col">
          {tabs.map((tab, index) => {
            const isSelected = selectedTab === tab;

            return (
              <li key={tab.title}>
                <button
                  className={twJoin(
                    'inline-flex items-end gap-2 px-11 py-3 hover:bg-theme-hover',
                    index === 0 ? 'border-r' : 'border-x',
                    isSelected ? 'border-theme-seperator' : 'border-theme-page-content',
                    isSelected ? 'bg-theme-hover' : ''
                  )}
                  onClick={() => setSelectedTab(selectedTab === tab ? null : tab)}
                >
                  <span className="text-2xl font-medium">
                    {typeof tab.count === 'number' ? num(tab.count) : tab.count}
                  </span>
                  <span className="text-theme-helptext uppercase text-sm pb-0.5">
                    {tab.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div>Developers</div>
      </div>
      <span role="region">{selectedTab ? <selectedTab.Component /> : null}</span>
    </div>
  );
};

export default RepoHealth2;
