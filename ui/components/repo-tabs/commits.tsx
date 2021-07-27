import React, { ImgHTMLAttributes, useState } from 'react';
import { add } from 'rambda';
import { RepoAnalysis } from '../../../shared/types';
import AlertMessage from '../AlertMessage';
import { Tab } from '../ExpandingCard';
import TabContents from './TabContents';
import defaultProfilePic from '../default-profile-pic.png';
import { num } from '../../helpers';
import CommitTimeline from '../CommitTimeline';

const ProfilePic: React.FC<ImgHTMLAttributes<HTMLImageElement>> = ({ src, ...rest }) => {
  const [actualSrc, setActualSrc] = useState(src || defaultProfilePic);
  const onError = () => setActualSrc(defaultProfilePic);

  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={actualSrc} onError={onError} {...rest} />;
};

export default (commits: RepoAnalysis['commits']): Tab => {
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
                          : ' '}
                      </td>
                      <td
                        title={`Modified ${num(commitsByDev.changes.edit)} files`}
                        className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-400"
                      >
                        {commitsByDev.changes.edit
                          ? `~${num(commitsByDev.changes.edit)}`
                          : ' '}
                      </td>
                      <td
                        title={`Deleted code in ${num(commitsByDev.changes.delete)} files`}
                        className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-700"
                      >
                        {commitsByDev.changes.delete
                          ? `-${num(commitsByDev.changes.delete)}`
                          : ' '}
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
