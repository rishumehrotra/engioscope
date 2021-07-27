import React from 'react';
import { RepoAnalysis } from '../../shared/types';
import { num } from '../helpers';
import Card from './ExpandingCard';
import Flair from './Flair';
import builds from './repo-tabs/builds';
import branches from './repo-tabs/branches';
import commits from './repo-tabs/commits';
import prs from './repo-tabs/prs';
import tests from './repo-tabs/tests';
import codeQuality from './repo-tabs/codeQuality';

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

const RepoHealth: React.FC<{repo: RepoAnalysis}> = ({ repo }) => (
  <Card
    title={repo.name}
    titleUrl={repo.url}
    subtitle={repoSubtitle(repo.languages)}
    tag={repo.commits.count === 0 ? 'Inactive' : undefined}
    tabs={[
      builds(repo.builds),
      branches(repo.defaultBranch, repo.branches),
      commits(repo.commits),
      prs(repo.prs),
      tests(repo.tests),
      codeQuality(repo.codeQuality)
    ]}
  />
);

export default RepoHealth;
