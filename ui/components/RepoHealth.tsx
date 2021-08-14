import React, {
  useCallback, useEffect, useMemo, useState
} from 'react';
import { Link, useHistory } from 'react-router-dom';
import type { RepoAnalysis } from '../../shared/types';
import { num } from '../helpers/utils';
import Card from './common/ExpandingCard';
import Flair from './common/Flair';
import builds from './repo-tabs/builds';
import branches from './repo-tabs/branches';
import commits from './repo-tabs/commits';
import prs from './repo-tabs/prs';
import tests from './repo-tabs/tests';
import codeQuality from './repo-tabs/codeQuality';
import type { Tab } from './repo-tabs/Tabs';
import { TopLevelTab } from './repo-tabs/Tabs';
import { useSortParams } from '../hooks/sort-hooks';

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

const RepoHealth: React.FC<{repo: RepoAnalysis; isFirst: boolean}> = ({ repo, isFirst }) => {
  const tabs = useMemo(() => [
    builds(repo.builds),
    branches(repo.defaultBranch, repo.branches),
    commits(repo.commits),
    prs(repo.prs),
    tests(repo.tests),
    codeQuality(repo.codeQuality)
  ], [repo]);

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
    setSelectedTab(!selectedTab ? tabs[0] : null);
  }, [selectedTab, tabs]);

  const history = useHistory();
  const pipelinesUrl = () => history.location.pathname.replace('/repos', `/release-pipelines?search=repo:"${repo.name}"`);

  return (
    <Card
      title={repo.name}
      titleUrl={repo.url}
      subtitle={repoSubtitle(repo.languages)}
      tag={repo.commits.count === 0 ? 'Inactive' : undefined}
      onCardClick={onCardClick}
      isExpanded={selectedTab !== null || isFirst}
    >
      {repo.pipelines ? (
        <div className="mx-6 flex flex-wrap items-baseline mt-2">
          <span className="text-sm text-gray-600">Part of &nbsp;</span>
          <Link
            to={pipelinesUrl}
            className="text-blue-600 font-semibold text-sm hover:underline -ml-1"
          >
            {`${repo.pipelines.length} release pipeline${repo.pipelines.length > 1 ? 's' : ''}`}
          </Link>
        </div>
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
      <span role="region">{selectedTab ? selectedTab.content : null}</span>
    </Card>
  );
};

export default RepoHealth;
