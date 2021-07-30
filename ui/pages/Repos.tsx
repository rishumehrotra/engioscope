/* eslint-disable jsx-a11y/control-has-associated-label */
import React from 'react';
import { RepoAnalysis } from '../../shared/types';
import AlertMessage from '../components/AlertMessage';
import RepoHealth from '../components/RepoHealth';
import AppliedFilters from '../components/AppliedFilters';

const Repos: React.FC<{ repos: RepoAnalysis[] }> = ({ repos }) => (
  <div>
    <AppliedFilters count={repos.length} />
    {
      repos.length ? repos.map(repo => (
        <RepoHealth repo={repo} key={repo.name} />
      )) : <AlertMessage message="No repos found" />
    }
  </div>
);

export default Repos;
