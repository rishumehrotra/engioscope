import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { byString } from 'sort-lib';
import { uniq } from 'rambda';
import { Check, X } from 'react-feather';
import { TRPCClientError } from '@trpc/client';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';
import { trpc } from '../../helpers/trpc.js';
import emptyList from './empty-list.svg';
import useQueryParam, { asStringArray } from '../../hooks/use-query-param.js';
import useRepoFilters from '../../hooks/use-repo-filters.jsx';
import SearchInput from '../common/SearchInput.jsx';

type TeamSelectorProps = {
  type: 'create' | 'edit' | 'duplicate';
  onSuccess: () => void;
  onCancel: () => void;
};

const useClearCache = (teamName?: string) => {
  const utils = trpc.useContext();
  const cnp = useCollectionAndProject();
  const filters = useRepoFilters();

  return useCallback(() => {
    if (!teamName) return;
    return Promise.all([
      utils.teams.getRepoIdsForTeamName.invalidate({ ...cnp, name: teamName }),
      utils.teams.getTeamNames.invalidate({ ...cnp }),
      utils.repos.getFilteredAndSortedReposWithStats.invalidate(filters),
      utils.repos.getRepoListingWithPipelineCount.invalidate(filters),
      utils.sonar.getSonarRepos.invalidate(filters),
    ]);
  }, [
    cnp,
    filters,
    teamName,
    utils.repos.getFilteredAndSortedReposWithStats,
    utils.repos.getRepoListingWithPipelineCount,
    utils.sonar.getSonarRepos,
    utils.teams.getRepoIdsForTeamName,
    utils.teams.getTeamNames,
  ]);
};

const TeamSelectorModal = ({ type, onSuccess, onCancel }: TeamSelectorProps) => {
  const cnp = useCollectionAndProject();
  const [teamNameInQueryParam, setTeamNameInQueryParam] = useQueryParam(
    'teams',
    asStringArray
  );
  const allRepos = trpc.repos.getRepoIdsAndNames.useQuery(cnp);
  const createTeam = trpc.teams.createTeam.useMutation();
  const updateTeam = trpc.teams.updateTeam.useMutation();

  const [search, setSearch] = useState('');
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
  const [footerSaveError, setFooterSaveError] = useState<'no-empty' | 'unknown' | null>(
    null
  );
  const [textboxValidationError, setTextboxValidationError] = useState<
    'no-empty' | 'duplicate' | null
  >(null);
  const [disableForm, setDisableForm] = useState(false);
  const [teamName, setTeamName] = useState(
    type === 'create'
      ? ''
      : type === 'edit'
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        teamNameInQueryParam![0]
      : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        `${teamNameInQueryParam![0]} - copy`
  );

  const clearCache = useClearCache(teamNameInQueryParam?.[0]);
  const teamNameInputRef = useRef<HTMLInputElement>(null);
  const searchReposRef = useRef<HTMLInputElement>(null);

  const teamRepos = trpc.teams.getRepoIdsForTeamName.useQuery(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
    { ...cnp, name: teamNameInQueryParam?.[0]! },
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    { enabled: type === 'edit' && Boolean(teamNameInQueryParam![0]) }
  );
  useEffect(() => {
    if (teamRepos.data && type === 'edit') {
      setSelectedRepoIds(teamRepos.data);
    }
  }, [teamRepos.data, type]);

  const filteredReposWithUsed = useMemo(() => {
    const preFiltered =
      search.trim() === ''
        ? allRepos.data
        : allRepos.data?.filter(r =>
            r.name.toLowerCase().includes(search.trim().toLowerCase())
          );

    return preFiltered
      ?.map(r => ({ ...r, isSelected: selectedRepoIds.includes(r.id) }))
      .sort(byString(r => r.name.toLowerCase()));
  }, [allRepos.data, search, selectedRepoIds]);

  const selectedRepos = useMemo(() => {
    return allRepos.data
      ?.filter(r => selectedRepoIds.includes(r.id))
      .sort(byString(r => r.name.toLowerCase()));
  }, [allRepos.data, selectedRepoIds]);

  const onSave: React.FormEventHandler<HTMLFormElement> = useCallback(
    event => {
      event.preventDefault();

      if (teamName.trim() === '') {
        setTextboxValidationError('no-empty');
        teamNameInputRef.current?.focus();
        teamNameInputRef.current?.select();
        return;
      }

      if (selectedRepoIds.length === 0) {
        setFooterSaveError('no-empty');
        searchReposRef.current?.focus();
        return;
      }

      setTextboxValidationError(null);
      setFooterSaveError(null);
      setDisableForm(true);

      const action =
        type === 'edit'
          ? updateTeam.mutateAsync({
              ...cnp,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              oldName: teamNameInQueryParam![0],
              newName: teamNameInputRef.current?.value.trim() || '',
              repoIds: selectedRepoIds,
            })
          : createTeam.mutateAsync({ ...cnp, name: teamName, repoIds: selectedRepoIds });

      action
        .then(async () => {
          setTeamNameInQueryParam([teamName]);
          onSuccess();
          return clearCache();
        })
        .catch(error => {
          if (
            error instanceof TRPCClientError &&
            error.message === 'A team with this name already exists'
          ) {
            setTextboxValidationError('duplicate');
            setTimeout(() => {
              teamNameInputRef.current?.focus();
              teamNameInputRef.current?.select();
            }, 4);
            return;
          }
          setFooterSaveError('unknown');
        })
        .finally(() => {
          setDisableForm(false);
        });
    },
    [
      clearCache,
      cnp,
      createTeam,
      onSuccess,
      selectedRepoIds,
      setTeamNameInQueryParam,
      teamName,
      teamNameInQueryParam,
      type,
      updateTeam,
    ]
  );

  useEffect(() => {
    teamNameInputRef.current?.focus();
    teamNameInputRef.current?.select();
  }, []);

  return (
    <form
      onSubmit={onSave}
      className="grid grid-cols-2 grid-rows-[min-content_1fr_min-content] h-full"
    >
      <div className="p-5 px-6 col-span-2">
        <input
          type="text"
          placeholder="Enter your team name"
          className={`inline-block w-full ${textboxValidationError ? 'invalid' : ''}`}
          value={teamName}
          onChange={e => {
            setTeamName(e.target.value);
            setTextboxValidationError(null);
          }}
          ref={teamNameInputRef}
          disabled={disableForm}
        />
        {textboxValidationError && (
          <p className="text-theme-danger text-sm pt-1">
            {textboxValidationError === 'no-empty' && 'Tean name cannot be empty'}
            {textboxValidationError === 'duplicate' &&
              'A team with this name already exists, pick a different team name'}
          </p>
        )}
      </div>
      <div className="p-6 pt-0 pb-4 grid grid-rows-[min-content_1fr]">
        <div>
          <SearchInput
            placeholder="Search repositories..."
            ref={searchReposRef}
            disabled={disableForm}
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
                disabled={disableForm}
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
                  onClick={() => setSelectedRepoIds(rs => uniq([...rs, repo.id]))}
                  disabled={disableForm}
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
      <div
        className={`border rounded-md border-theme-seperator mr-6 mb-4 overflow-auto ${
          selectedRepos?.length === 0 ? 'grid place-items-center bg-theme-secondary' : ''
        }`}
      >
        {selectedRepos?.length === 0 ? (
          <div className="m-auto">
            <img src={emptyList} alt="Add repositories" className="m-auto" />
            <br />
            <span className="inline-block mx-24 text-center text-theme-helptext text-sm">
              Select repositories on the left to create a team
            </span>
          </div>
        ) : (
          <>
            <div>
              <div className="grid grid-flow-col grid-col-2 justify-between items-center text-sm border-theme-seperator px-2 py-3">
                <div className="text-theme-icon">
                  <span className="font-semibold">{selectedRepos?.length}</span>{' '}
                  repositories added
                </div>
                <div>
                  <button
                    type="button"
                    className="link-text font-semibold mr-1"
                    onClick={() => setSelectedRepoIds([])}
                    disabled={disableForm}
                  >
                    Remove all
                  </button>
                </div>
              </div>
            </div>
            <ul className="h-1">
              {selectedRepos?.map(repo => (
                <li
                  key={repo.id}
                  className="border-b border-theme-seperator p-3 grid grid-cols-[1fr_30px] justify-between"
                >
                  {repo.name}
                  <button
                    type="button"
                    onClick={() => setSelectedRepoIds(r => r.filter(x => x !== repo.id))}
                    disabled={disableForm}
                  >
                    <X size={20} className="text-theme-danger" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="col-span-2 grid grid-cols-[1fr_min-content] justify-between items-center pb-5">
        <div className="ml-6 text-theme-danger text-sm">
          {footerSaveError === 'unknown' &&
            'Woops! Something went wrong. Please try again later.'}
          {footerSaveError === 'no-empty' && 'You must select at least one repository.'}
        </div>
        <div className="text-right px-6 whitespace-nowrap">
          <button
            type="button"
            onClick={onCancel}
            disabled={disableForm}
            className="secondary-button inline-block mr-4"
          >
            Cancel
          </button>
          <button type="submit" disabled={disableForm} className="primary-button">
            Save
          </button>
        </div>
      </div>
    </form>
  );
};

export default TeamSelectorModal;
