import { add } from 'rambda';
import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import type { Dev } from '../types';
import CommitTimeline from './CommitTimeline';
import { DownChevron, UpChevron } from './common/Icons';

const Developer: React.FC<{ dev: Dev; isFirst: boolean }> = ({ dev, isFirst }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isFirst);
  const history = useHistory();
  const allCommits = dev.repos.flatMap(r => Object.values(r.byDate));
  const commitsCount = allCommits.reduce(add, 0);

  return (
    <li
      className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out
        rounded-lg shadow relative workitem-body"
    >
      <button
        className="w-full text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="flex justify-between">
          <img src={dev.imageUrl} alt={dev.name} />
          <div>{dev.name}</div>
        </h3>
        {isExpanded ? (
          <span className="flex text-gray-500">
            <span>Show less</span>
            <UpChevron />
          </span>
        ) : (
          <span className="flex text-gray-500">
            <span className="show-more">Show more</span>
            <DownChevron />
          </span>
        )}
      </button>
      <div className="text-base font-normal text-gray-800">
        <span className="text-blue-gray text-sm my-2">
          <span className="font-semibold text-base">
            {commitsCount}
          </span>
          {` ${commitsCount === 1 ? 'commit' : 'commits'} in `}
          <span className="font-semibold text-base">
            {dev.repos.length}
          </span>
          {` ${dev.repos.length === 1 ? 'repo' : 'repos'}`}
        </span>
      </div>
      {isExpanded && (
        <>
          <table>
            <thead>
              <tr>
                <th>Repo</th>
                <th>Commits</th>
                <th>Timeline</th>
              </tr>
            </thead>
            <tbody>
              {dev.repos
                .sort((a, b) => Object.values(b.byDate).reduce(add, 0) - Object.values(a.byDate).reduce(add, 0))
                .map(repo => (
                  <tr key={repo.name}>
                    <td>
                      <Link to={history.location.pathname.replace('/devs', `/repos?search="${repo.name}"`)}>
                        {repo.name}
                      </Link>
                    </td>
                    <td>{Object.values(repo.byDate).reduce(add, 0)}</td>
                    <td>
                      <CommitTimeline timeline={repo.byDate} max={Math.max(...allCommits)} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p>
            Data shown is for the last 30 days, not including merge commits
          </p>
        </>
      )}
    </li>
  );
};

export default Developer;
