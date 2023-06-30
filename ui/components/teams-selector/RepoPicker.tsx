import type { Dispatch } from 'react';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { byString } from 'sort-lib';
import { uniq } from 'rambda';
import { Check } from 'react-feather';
import SearchInput from '../common/SearchInput.jsx';

type RepoPickerProps = {
  disabled: boolean;
  allRepos:
    | {
        id: string;
        name: string;
      }[]
    | undefined;
  selectedRepoIds: string[];
  setSelectedRepoIds: Dispatch<React.SetStateAction<string[]>>;
};

const RepoPicker = forwardRef<HTMLInputElement, RepoPickerProps>(
  ({ disabled, allRepos, selectedRepoIds, setSelectedRepoIds }, searchReposRef) => {
    const [search, setSearch] = useState('');

    const filteredReposWithUsed = useMemo(() => {
      const preFiltered =
        search.trim() === ''
          ? allRepos
          : allRepos?.filter(r =>
              r.name.toLowerCase().includes(search.trim().toLowerCase())
            );

      return preFiltered
        ?.map(r => ({ ...r, isSelected: selectedRepoIds.includes(r.id) }))
        .sort(byString(r => r.name.toLowerCase()));
    }, [allRepos, search, selectedRepoIds]);

    const onRepoSelect = useCallback(
      (repoId: string) => () => {
        setSelectedRepoIds(rs =>
          rs.includes(repoId) ? rs.filter(r => r !== repoId) : uniq([...rs, repoId])
        );
      },
      [setSelectedRepoIds]
    );

    return (
      <div className="p-6 pt-0 pb-4 grid grid-rows-[min-content_1fr]">
        <div>
          <SearchInput
            placeholder="Search repositories..."
            ref={searchReposRef}
            disabled={disabled}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-b-none border-theme-seperator"
          />

          <div className="grid grid-flow-col grid-col-2 justify-between items-center text-sm border-x border-theme-seperator py-2 px-3">
            <div className="text-theme-icon">
              Showing{' '}
              <span className="font-semibold">
                {filteredReposWithUsed?.length || '...'}
              </span>{' '}
              repositories
            </div>
            <div>
              <button
                type="button"
                onClick={() =>
                  setSelectedRepoIds(rs =>
                    uniq([...rs, ...(filteredReposWithUsed || []).map(r => r.id)])
                  )
                }
                className="link-text font-semibold"
                disabled={disabled}
              >
                Add all
              </button>
            </div>
          </div>
        </div>

        <div className="border-theme-seperator border-b border-x rounded-b-md overflow-auto">
          <ul className="max-h-[16vh]">
            {filteredReposWithUsed?.map(repo => (
              <li key={repo.id} className="border-b border-theme-seperator">
                <button
                  type="button"
                  className="p-3 w-full text-left grid grid-cols-[1fr_30px] justify-between hover:bg-theme-hover"
                  onClick={onRepoSelect(repo.id)}
                  disabled={disabled}
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
      </div>
    );
  }
);

export default RepoPicker;
