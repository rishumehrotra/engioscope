import React, { useMemo, useState } from 'react';
import { byString } from 'sort-lib';
import { uniq } from 'rambda';
import { Check, X } from 'react-feather';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';
import { trpc } from '../../helpers/trpc.js';

type TeamSelectorProps =
  | {
      type: 'create';
    }
  | {
      type: 'edit';
      teamName: string;
    }
  | {
      type: 'duplicate';
      fromTeamName: string;
    };

const TeamSelectorModal = (props: TeamSelectorProps) => {
  console.log(props);

  const cnp = useCollectionAndProject();
  const allRepos = trpc.repos.getRepoIdsAndNames.useQuery(cnp);
  const [search, setSearch] = useState('');
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);

  const filteredReposWithUsed = useMemo(() => {
    const preFiltered =
      search.trim() === ''
        ? allRepos.data
        : allRepos.data?.filter(r => r.name.toLowerCase().includes(search.trim()));

    return preFiltered
      ?.map(r => ({ ...r, isSelected: selectedRepoIds.includes(r.id) }))
      .sort(byString(r => r.name.toLowerCase()));
  }, [allRepos.data, search, selectedRepoIds]);

  const selectedRepos = useMemo(() => {
    return allRepos.data
      ?.filter(r => selectedRepoIds.includes(r.id))
      .sort(byString(r => r.name.toLowerCase()));
  }, [allRepos.data, selectedRepoIds]);

  return (
    <div className="grid grid-flow-row grid-rows-[min-content_1fr_min-content] h-full">
      <div className="p-5 px-6">
        <input
          type="text"
          placeholder="Enter your team name"
          className="inline-block w-full"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </div>
      <div className="grid grid-flow-col grid-cols-2 h-auto">
        <div className="flex flex-col p-6 pt-0 pb-4">
          <div>
            <input
              type="search"
              placeholder="Search repositories..."
              className="inline-block w-full rounded-b-none border-theme-seperator"
              onChange={e => setSearch(e.target.value)}
            />

            <div className="grid grid-flow-col grid-col-2 justify-between items-center text-sm border-x-[1px] border-theme-seperator py-2 px-3">
              <div className="text-theme-icon">
                Showing{' '}
                <span className="font-semibold">
                  {filteredReposWithUsed?.length || '...'}
                </span>{' '}
                repositories
              </div>
              <div>
                <button
                  onClick={() =>
                    setSelectedRepoIds(rs =>
                      uniq([...rs, ...(filteredReposWithUsed || []).map(r => r.id)])
                    )
                  }
                  className="link-text font-semibold"
                >
                  Add all
                </button>
              </div>
            </div>
          </div>

          <ul className="overflow-auto flex-grow h-1 border-x-[1px] border-theme-seperator border-b-[1px] rounded-b-md">
            {filteredReposWithUsed?.map(repo => (
              <li className="border-b border-theme-seperator">
                <button
                  className="p-3 w-full text-left grid grid-cols-[1fr_30px] justify-between"
                  onClick={() => setSelectedRepoIds(rs => uniq([...rs, repo.id]))}
                >
                  <span className="max-w-full inline-block truncate">{repo.name}</span>
                  <span>
                    {repo.isSelected ? (
                      <Check size={20} className="text-theme-success" />
                    ) : (
                      ''
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col border rounded-md border-theme-seperator mr-6 mb-4">
          <div>
            <div className="grid grid-flow-col grid-col-2 justify-between items-center text-sm border-x-[1px] border-theme-seperator px-2 py-3">
              <div className="text-theme-icon">
                <span className="font-semibold">{selectedRepos?.length}</span>{' '}
                repositories added
              </div>
              <div>
                <button
                  className="link-text font-semibold"
                  onClick={() => setSelectedRepoIds([])}
                >
                  Remove all
                </button>
              </div>
            </div>
          </div>
          <ul className="overflow-auto flex-grow h-1 border-x-[1px] border-theme-seperator border-b-[1px] rounded-b-md">
            {selectedRepos?.map(repo => (
              <li className="border-b border-theme-seperator p-3 grid grid-cols-[1fr_30px] justify-between">
                {repo.name}
                <button
                  onClick={() => setSelectedRepoIds(r => r.filter(x => x !== repo.id))}
                >
                  <X size={20} className="text-theme-danger" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="text-right px-6 pb-5">
        <button className="secondary-button inline-block mr-6">Cancel</button>
        <button className="primary-button">Save</button>
      </div>
    </div>
  );
};

export default TeamSelectorModal;
