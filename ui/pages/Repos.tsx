import React from 'react';
import { RepoAnalysis } from '../../shared/types';
import AlertMessage from '../components/AlertMessage';
import RepoHealth from '../components/RepoHealth';

const Repos:React.FC<{repos: RepoAnalysis[]}> = ({ repos }) => (
  <div>
    {
      repos.length ? repos.map(repo => (
        <RepoHealth repo={repo} key={repo.name} />
      )) : <AlertMessage message="No repos found" />
    }
  </div>
);

export default Repos;
