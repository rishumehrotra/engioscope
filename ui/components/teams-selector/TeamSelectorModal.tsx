import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { byString } from 'sort-lib';
import { X } from 'react-feather';
import { TRPCClientError } from '@trpc/client';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';
import { trpc } from '../../helpers/trpc.js';
import emptyList from './empty-list.svg';
import useQueryParam, { asStringArray } from '../../hooks/use-query-param.js';
import useRepoFilters from '../../hooks/use-repo-filters.jsx';
import RepoPicker from './RepoPicker.jsx';

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
      className="grid grid-cols-[300px_1fr] grid-rows-[min-content_1fr_min-content]"
    >
      <RepoPicker
        disabled={disableForm}
        ref={searchReposRef}
        allRepos={allRepos.data}
        selectedRepoIds={selectedRepoIds}
        setSelectedRepoIds={setSelectedRepoIds}
        className="row-span-2 border-r border-b border-theme-seperator"
      />
      <div className="pt-5 px-6">
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

        {(selectedRepos?.length || 0) > 0 && (
          <div>
            <div className="grid grid-flow-col grid-col-2 justify-between items-center text-sm py-3">
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
        )}
      </div>
      <div
        className={`mr-2 overflow-auto border-b border-theme-seperator ${
          selectedRepos?.length === 0 ? 'grid place-items-center' : ''
        }`}
      >
        {selectedRepos?.length === 0 ? (
          <div className="m-auto">
            <img src={emptyList} alt="Add repositories" className="m-auto" />
            <div className="text-center font-medium mt-6 mb-1">No repositories added</div>
            <span className="inline-block mx-24 text-center text-theme-helptext text-sm">
              Select repositories on the left to create a team
            </span>
          </div>
        ) : (
          <ul className="h-1 -mr-2">
            {selectedRepos?.map(repo => (
              <li
                key={repo.id}
                className="pl-6 py-3 grid grid-cols-[1fr_min-content] justify-between border-b border-theme-seperator-light"
              >
                {repo.name}
                <button
                  type="button"
                  onClick={() => setSelectedRepoIds(r => r.filter(x => x !== repo.id))}
                  disabled={disableForm}
                  className="pr-6 inline-block"
                >
                  <X size={20} className="text-theme-danger" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="col-span-2 grid grid-cols-[1fr_min-content] justify-between items-center pb-5 pt-4">
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
