import type { MouseEventHandler } from 'react';
import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { not } from 'rambda';
import { useHotkeys } from 'react-hotkeys-hook';
import type { FeatureToggle, RepoAnalysis } from '../../shared/types.js';
import { num, pluralise } from '../helpers/utils.js';
import Flair from './common/Flair.js';
import builds from './repo-tabs/builds.js';
import commits from './repo-tabs/commits.js';
import prs from './repo-tabs/prs.js';
import tests from './repo-tabs/tests.js';
import codeQuality from './repo-tabs/codeQuality.js';
import type { Tab } from './repo-tabs/Tabs.js';
import { TopLevelTab } from './repo-tabs/Tabs.js';
import { useSortParams } from '../hooks/sort-hooks.js';
import usePageName from '../hooks/use-page-name.js';
import type { Dev } from '../types.js';
import { isInactive } from '../../shared/repo-utils.js';
import branches from './repo-tabs/branches/index.js';
import { DownChevron } from './common/Icons.jsx';
import useOnClickOutside from '../hooks/on-click-outside.js';
import useQueryParam, { asBoolean } from '../hooks/use-query-param.js';
import { trpc } from '../helpers/trpc.js';
import { useQueryContext } from '../hooks/query-hooks.js';
import { divide, toPercentage } from '../../shared/utils.js';

const FeatureToggleDropdown: React.FC<{ featureToggles: FeatureToggle[] }> = ({
  featureToggles,
}) => {
  const [isFeatureToggleExpanded, setFeatureToggleExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const onButtonClick: MouseEventHandler<HTMLButtonElement> = useCallback(event => {
    event.stopPropagation();
    setFeatureToggleExpanded(not);
  }, []);

  useOnClickOutside(ref, () => {
    setFeatureToggleExpanded(false);
  });
  useHotkeys('esc', () => setFeatureToggleExpanded(false));

  if (featureToggles.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        className={`border px-3 py-0.5 rounded-lg text-sm ${
          isFeatureToggleExpanded
            ? 'bg-gray-100 border-gray-400'
            : 'bg-gray-50 border-gray-300'
        } hover:bg-gray-100 hover:border-gray-400`}
        onClick={onButtonClick}
      >
        {'Uses '}
        <strong>{featureToggles.length}</strong>
        {` feature ${featureToggles.length === 1 ? 'toggle' : 'toggles'}`}
        <DownChevron className="inline-block w-4 h-4 -m-1 ml-2" />
      </button>
      {isFeatureToggleExpanded ? (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div
          className="absolute top-8 py-2 px-5 rounded-lg text-left right-0 bg-black text-white shadow-md cursor-default"
          style={{ width: '500px' }}
          onClick={event => event.stopPropagation()}
        >
          Content
        </div>
      ) : null}
    </div>
  );
};

const combinedQualityGate = (qualityGateStatus: string[]) => {
  if (qualityGateStatus.length === 0) return 'Unknown';
  if (qualityGateStatus.length === 1) return qualityGateStatus[0];
  const qualityGatesPassed = qualityGateStatus.filter(status => status !== 'fail');
  if (qualityGatesPassed.length === qualityGateStatus.length) return '100% fail';
  return `${divide(qualityGatesPassed.length, qualityGateStatus.length)
    .map(toPercentage)
    .getOr('-')} pass`;
};

type RepoHealthProps = {
  repo: RepoAnalysis;
  aggregatedDevs: Record<string, Dev>;
  isFirst?: boolean;
  queryPeriodDays: number;
  featureToggles: FeatureToggle[];
};

const RepoHealth: React.FC<RepoHealthProps> = ({
  repo,
  isFirst,
  aggregatedDevs,
  queryPeriodDays,
  featureToggles,
}) => {
  const pageName = usePageName();
  const location = useLocation();
  const repoTabStats = trpc.repos.getRepoOverviewStats.useQuery({
    queryContext: useQueryContext(),
    repositoryIds: [repo.id],
  });

  const tabs = useMemo(
    () => [
      builds(repo.id, repo.name, repoTabStats.data?.builds[0]?.count),
      branches(
        repo.branches,
        repo.defaultBranch,
        repo.id,
        repo.url,
        repoTabStats.data?.branches[0]?.total
      ),
      commits(
        repo,
        aggregatedDevs,
        location,
        queryPeriodDays,
        repoTabStats.data?.commits[0]?.count
      ),
      prs(repo.id, repo.prs, repoTabStats.data?.pullRequests[0]?.total),
      tests(repo, queryPeriodDays, repoTabStats.data?.tests[0]?.totalTests),
      codeQuality(
        repo.codeQuality,
        repo.id,
        repo.defaultBranch,
        repoTabStats.data
          ? combinedQualityGate(
              repoTabStats.data?.sonarQualityGateStatuses[0]?.status || []
            )
          : null
      ),
    ],
    [repo, repoTabStats.data, aggregatedDevs, location, queryPeriodDays]
  );

  const [{ sortBy }] = useSortParams();
  const [selectedTab, setSelectedTab] = useState<Tab | null>(isFirst ? tabs[0] : null);
  const [isFtEnabled] = useQueryParam('ft', asBoolean);

  useEffect(() => {
    if (sortBy) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return setSelectedTab(isFirst ? tabs.find(t => t.title === sortBy)! : null);
    }
    return setSelectedTab(isFirst ? tabs[0] : null);
  }, [sortBy, tabs, isFirst]);

  const onCardClick = useCallback(() => {
    setSelectedTab(selectedTab ? null : tabs[0]);
  }, [selectedTab, tabs]);

  const pipelinesUrl = location.pathname.replace(
    '/repos',
    `/release-pipelines?search=repo:"${repo.name}"`
  );
  const isExpanded = selectedTab !== null || isFirst || false;

  return (
    <div
      className={`bg-white ease-in-out rounded-lg shadow relative ${
        isInactive(repo) ? 'opacity-60' : ''
      } border-l-4 p-6 mb-4 transition-colors duration-500 ${
        isExpanded ? 'border-gray-500' : ''
      }`}
    >
      <div className="grid grid-flow-row mt-2">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
        <div
          className="w-full cursor-pointer"
          role="button"
          onClick={onCardClick}
          tabIndex={0}
        >
          <div className="grid mx-6 grid-flow-col items-stretch">
            <div>
              <div>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-text font-bold text-lg truncate max-width-full"
                  onClick={event => event.stopPropagation()}
                >
                  {repo.name}
                </a>
                {repoTabStats.data?.sonarQualityGateStatuses[0]?.language?.ncloc ==
                null ? null : (
                  <span className="inline-block ml-4">
                    {' '}
                    {repoTabStats.data.sonarQualityGateStatuses[0].language.stats.map(
                      l => (
                        <Flair
                          key={l.lang}
                          flairColor={l.color}
                          title={`${num(l.loc)} lines of code`}
                          label={`${divide(
                            l.loc,
                            repoTabStats.data?.sonarQualityGateStatuses[0]?.language
                              ?.ncloc || 0
                          )
                            .map(toPercentage)
                            .getOr('-')} ${l.lang}`}
                        />
                      )
                    )}
                  </span>
                )}
              </div>
              {repoTabStats.data ? (
                <div>
                  <Link to={pipelinesUrl} className="link-text">
                    {`Has ${pluralise(
                      repoTabStats.data?.releaseBranches[0]?.branches?.length || 0,
                      'release branch',
                      `release branches`
                    )},`}{' '}
                    {`used in ${
                      repoTabStats.data?.pipelineCounts[0]?.count || 0
                    } ${pageName(
                      'release-pipelines',
                      repoTabStats.data?.pipelineCounts[0]?.count || 0
                    ).toLowerCase()}`}{' '}
                  </Link>
                  {/* <ol className="flex flex-wrap">
                    {repoTabStats.data?.releaseBranches[0]?.branches?.map(branch => (
                      <li
                        key={`gone-forward-${branch.name}`}
                        className="mr-1 mb-1 px-2 border-2 rounded-md bg-white flex items-center text-sm"
                      >
                        <Branches className="h-4 mr-1" />
                        {branch.name.replace('refs/heads/', '')}
                        <BranchPolicyPill
                          repositoryId={
                            repoTabStats.data?.releaseBranches[0]?.repositoryId
                          }
                          refName={branch.name}
                          conforms={branch.conforms}
                        />
                      </li>
                    ))}
                  </ol> */}
                </div>
              ) : null}
            </div>
            <div
              className="text-gray-600 font-semibold text-right"
              style={{ lineHeight: '27px' }}
            >
              {repoTabStats.data ? (
                <div
                  className="italic text-sm text-gray-400"
                  style={{ lineHeight: 'inherit' }}
                >
                  Default branch{' '}
                  <code className="border-gray-300 border-2 rounded-md px-1 py-0 bg-gray-50">
                    {repoTabStats.data
                      ? repoTabStats.data?.repoDetails[0].defaultBranch?.replace(
                          'refs/heads/',
                          ''
                        ) || 'N/A'
                      : null}
                  </code>
                </div>
              ) : null}
              {isFtEnabled ? (
                <FeatureToggleDropdown featureToggles={featureToggles} />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isInactive(repo) ? (
        <p className="pl-5">
          <span
            className="bg-amber-300 text-xs inline-block py-1 px-2 uppercase rounded-md"
            data-tip={`This repository doesn't count towards stats,<br />
            as it hasn't seen any commits or builds in the last ${queryPeriodDays} days.`}
            data-html
          >
            Inactive
          </span>
        </p>
      ) : null}

      <div className="mt-4 px-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {tabs.map(tab => (
          <TopLevelTab
            key={tab.title}
            count={tab.count}
            label={tab.title}
            isSelected={selectedTab === tab}
            onToggleSelect={() => setSelectedTab(selectedTab === tab ? null : tab)}
          />
        ))}
      </div>
      <span role="region">{selectedTab ? <selectedTab.Component /> : null}</span>
    </div>
  );
};

export default RepoHealth;
