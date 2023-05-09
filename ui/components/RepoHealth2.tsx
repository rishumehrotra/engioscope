import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { num, pluralise } from '../helpers/utils.js';
import Flair from './common/Flair.js';
import builds from './repo-tabs2/builds.js';
import commits from './repo-tabs2/commits.js';
import prs from './repo-tabs2/prs.js';
import tests from './repo-tabs2/tests.js';
import codeQuality from './repo-tabs2/codeQuality.js';
import type { Tab } from './repo-tabs2/Tabs.js';
import { TopLevelTab } from './repo-tabs2/Tabs.js';
import { useSortParams } from '../hooks/sort-hooks.js';
import usePageName from '../hooks/use-page-name.js';
import branches from './repo-tabs2/branches/index.js';
import type { RepoItem } from '../helpers/trpc.js';
import { divide, toPercentage } from '../../shared/utils.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';

const combinedQualityGate = (qualityGateStatus: string[]) => {
  if (qualityGateStatus.length === 0) return 'Unknown';
  if (qualityGateStatus.length === 1) return qualityGateStatus[0];
  const qualityGatesPassed = qualityGateStatus.filter(status => status !== 'fail');
  if (qualityGatesPassed.length === qualityGateStatus.length) return '100% fail';
  return `${divide(qualityGatesPassed.length, qualityGateStatus.length)
    .map(toPercentage)
    .getOr('-')} pass`;
};

type RepoHealthProps2 = {
  item: RepoItem;
  isFirst?: boolean;
};

const RepoHealth2: React.FC<RepoHealthProps2> = ({ item, isFirst }) => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const pageName = usePageName();
  const location = useLocation();

  const tabs = useMemo(
    () => [
      builds(item.repositoryId, item.repoDetails.name, item.builds),
      branches(
        item.repoDetails.defaultBranch || 'master',
        item.repositoryId,
        item.repoDetails.url || '',
        item.branches
      ),
      commits(item.repositoryId, queryPeriodDays, item.commits),
      prs(item.repositoryId, item.pullRequests),
      tests(item.repositoryId, queryPeriodDays, item.tests),
      codeQuality(
        item.repositoryId,
        item.repoDetails.defaultBranch || 'master',
        combinedQualityGate(item.sonarQualityGateStatuses?.status || [])
        // repoTabStats.data
        //   ? combinedQualityGate(
        //       repoTabStats.data?.sonarQualityGateStatuses[0]?.status || []
        //     )
        //   : null
      ),
    ],
    [
      item.repositoryId,
      item.repoDetails.name,
      item.repoDetails.defaultBranch,
      item.repoDetails.url,
      item.builds,
      item.branches,
      item.commits,
      item.pullRequests,
      item.tests,
      item.sonarQualityGateStatuses?.status,
      queryPeriodDays,
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

  const onCardClick = useCallback(() => {
    setSelectedTab(selectedTab ? null : tabs[0]);
  }, [selectedTab, tabs]);

  const pipelinesUrl = location.pathname.replace(
    '/repos',
    `/release-pipelines?search=repo:"${item.repoDetails.name}"`
  );
  const isExpanded = selectedTab !== null || isFirst || false;

  return (
    <div
      className={`bg-white ease-in-out rounded-lg shadow relative ${
        item.builds === 0 && item.commits === 0 ? 'opacity-60' : ''
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
                  href={item.repoDetails.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-text font-bold text-lg truncate max-width-full"
                  onClick={event => event.stopPropagation()}
                >
                  {item.repoDetails.name || 'Repo Name'}
                </a>
                {!item.sonarQualityGateStatuses ||
                item.sonarQualityGateStatuses.language === null ? null : (
                  <span className="inline-block ml-4">
                    {' '}
                    {item.sonarQualityGateStatuses.language.stats.map(l => (
                      <Flair
                        key={l.lang}
                        flairColor={l.color}
                        title={`${num(l.loc)} lines of code`}
                        label={`${divide(
                          l.loc,
                          !item.sonarQualityGateStatuses ||
                            item.sonarQualityGateStatuses?.language === null
                            ? 0
                            : item.sonarQualityGateStatuses.language.ncloc || 0
                        )
                          .map(toPercentage)
                          .getOr('-')} ${l.lang}`}
                      />
                    ))}
                  </span>
                )}
              </div>
              <div>
                <Link to={pipelinesUrl} className="link-text">
                  {`Has ${pluralise(
                    item.releaseBranches?.branches?.length || 0,
                    'release branch',
                    `release branches`
                  )},`}{' '}
                  {`used in ${item.pipelineCounts?.count || 0} ${pageName(
                    'release-pipelines',
                    item.pipelineCounts?.count || 0
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
            </div>
            <div
              className="text-gray-600 font-semibold text-right"
              style={{ lineHeight: '27px' }}
            >
              <div
                className="italic text-sm text-gray-400"
                style={{ lineHeight: 'inherit' }}
              >
                Default branch{' '}
                <code className="border-gray-300 border-2 rounded-md px-1 py-0 bg-gray-50">
                  {item.repoDetails.defaultBranch
                    ? item.repoDetails.defaultBranch.replace('refs/heads/', '')
                    : null}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {item.builds === 0 && item.commits === 0 ? (
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

export default RepoHealth2;
