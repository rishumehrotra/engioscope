import type { Dispatch, MutableRefObject } from 'react';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { byString } from 'sort-lib';
import { uniq } from 'rambda';
import { Check } from 'react-feather';
import { twMerge } from 'tailwind-merge';
import { useHotkeys } from 'react-hotkeys-hook';
import SearchInput from '../common/SearchInput.jsx';
import noSearchResults from './no-search-results.svg';

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
  className?: string;
};

const RepoPicker = forwardRef<HTMLInputElement, RepoPickerProps>(
  (
    { disabled, allRepos, selectedRepoIds, setSelectedRepoIds, className },
    searchReposRef
  ) => {
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

    useHotkeys('/', e => {
      e.stopPropagation();
      (searchReposRef as MutableRefObject<HTMLInputElement> | null)?.current?.focus();
    });

    return (
      <div
        className={twMerge(
          'bg-theme-secondary grid grid-rows-[min-content_1fr]',
          className
        )}
      >
        <div>
          <div className="mt-4 mb-1 mx-6">
            <SearchInput
              placeholder="Search repositories"
              ref={searchReposRef}
              disabled={disabled}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-theme-seperator"
            />
          </div>

          <div className="grid grid-flow-col grid-col-2 justify-between items-center text-sm py-2 px-6">
            <div className="text-theme-icon">
              Showing{' '}
              <span className="font-semibold">
                {filteredReposWithUsed?.length ?? '...'}
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

        <div className="overflow-auto">
          {filteredReposWithUsed?.length === 0 ? (
            <div className="items-center justify-center h-full grid place-content-center">
              <img
                src={noSearchResults}
                alt="No matches"
                className="inline-block m-auto"
              />
              <div className="font-medium m-auto -mt-5 mb-2">No results</div>
              <p className="m-auto text-center px-10 text-sm text-theme-helptext">
                Sorry, there are no repositories for this search
              </p>
            </div>
          ) : (
            <ul
              className="max-h-[16vh]"
              aria-multiselectable="true"
              role="listbox"
              tabIndex={0}
            >
              {filteredReposWithUsed?.map(repo => (
                <li key={repo.id} className="border-b border-theme-seperator-light">
                  <button
                    type="button"
                    className="pl-6 pr-3 py-3 w-full text-left grid grid-cols-[1fr_30px] justify-between"
                    onClick={onRepoSelect(repo.id)}
                    disabled={disabled}
                    role="option"
                    aria-selected={repo.isSelected}
                  >
                    <span
                      data-tooltip-id="react-tooltip"
                      data-tooltip-content={repo.name}
                      className="max-w-full inline-block truncate pr-2"
                    >
                      {repo.name}
                    </span>
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
          )}
        </div>
      </div>
    );
  }
);

export default RepoPicker;
