import React, { useCallback, useMemo, useRef, useState } from 'react';
import { byString } from 'sort-lib';
import { uniq } from 'rambda';
import { Check, X } from 'react-feather';
import { TRPCClientError } from '@trpc/client';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';
import { trpc } from '../../helpers/trpc.js';
import emptyList from './empty-list.svg';
import useQueryParam, { asStringArray } from '../../hooks/use-query-param.js';

type TeamSelectorProps = (
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
    }
) & {
  onSuccess: () => void;
  onCancel: () => void;
};

const TeamSelectorModal = ({ onCancel, onSuccess }: TeamSelectorProps) => {
  const cnp = useCollectionAndProject();
  const [, setTeamNameInQueryParam] = useQueryParam('teams', asStringArray);
  const allRepos = trpc.repos.getRepoIdsAndNames.useQuery(cnp);
  const createTeam = trpc.teams.createTeam.useMutation();
  const [search, setSearch] = useState('');
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
  const [footerSaveError, setFooterSaveError] = useState<'no-empty' | 'unknown' | null>(
    null
  );
  const [textboxValidationError, setTextboxValidationError] = useState<
    'no-empty' | 'duplicate' | null
  >(null);
  const [disableForm, setDisableForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  const teamNameInputRef = useRef<HTMLInputElement>(null);

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

  const onSave: React.FormEventHandler<HTMLFormElement> = useCallback(
    event => {
      event.preventDefault();

      setTextboxValidationError(null);
      setFooterSaveError(null);

      if (teamName.trim() === '') {
        setTextboxValidationError('no-empty');
        teamNameInputRef.current?.focus();
        return;
      }

      setDisableForm(true);

      createTeam
        .mutateAsync({ ...cnp, name: teamName, repoIds: selectedRepoIds })
        .then(() => {
          setTeamNameInQueryParam([teamName]);
          onSuccess();
        })
        .catch(error => {
          if (
            error instanceof TRPCClientError &&
            error.message === 'A team with this name already exists'
          ) {
            setTextboxValidationError('duplicate');
            setTimeout(() => {
              teamNameInputRef.current?.focus();
            }, 4);
            return;
          }
          setFooterSaveError('unknown');
        })
        .finally(() => {
          setDisableForm(false);
        });
    },
    [cnp, createTeam, onSuccess, selectedRepoIds, setTeamNameInQueryParam, teamName]
  );

  return (
    <form
      onSubmit={onSave}
      className="grid grid-flow-row grid-rows-[min-content_1fr_min-content] h-full"
    >
      <div className="p-5 px-6">
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
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
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
      <div className="grid grid-flow-col grid-cols-2 h-auto">
        <div className="flex flex-col p-6 pt-0 pb-4">
          <div>
            <input
              type="search"
              placeholder="Search repositories..."
              className="inline-block w-full rounded-b-none border-theme-seperator"
              onChange={e => setSearch(e.target.value)}
              disabled={disableForm}
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

          <ul className="overflow-auto flex-grow h-1 border-x-[1px] border-theme-seperator border-b-[1px] rounded-b-md">
            {filteredReposWithUsed?.map(repo => (
              <li key={repo.id} className="border-b border-theme-seperator">
                <button
                  type="button"
                  className="p-3 w-full text-left grid grid-cols-[1fr_30px] justify-between"
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
        <div
          className={`flex flex-col border rounded-md border-theme-seperator mr-6 mb-4 ${
            selectedRepos?.length === 0
              ? 'place-items-center bg-theme-secondary pt-28'
              : ''
          }`}
        >
          {selectedRepos?.length === 0 ? (
            <>
              <img src={emptyList} alt="Add repositories" />
              <br />
              <span className="inline-block mx-24 text-center text-theme-helptext text-sm">
                Select repositories on the left to create a team
              </span>
            </>
          ) : (
            <>
              <div>
                <div className="grid grid-flow-col grid-col-2 justify-between items-center text-sm border-x-[1px] border-theme-seperator px-2 py-3">
                  <div className="text-theme-icon">
                    <span className="font-semibold">{selectedRepos?.length}</span>{' '}
                    repositories added
                  </div>
                  <div>
                    <button
                      type="button"
                      className="link-text font-semibold"
                      onClick={() => setSelectedRepoIds([])}
                      disabled={disableForm}
                    >
                      Remove all
                    </button>
                  </div>
                </div>
              </div>
              <ul className="overflow-auto flex-grow h-1 border-x-[1px] border-theme-seperator border-b-[1px] rounded-b-md">
                {selectedRepos?.map(repo => (
                  <li
                    key={repo.id}
                    className="border-b border-theme-seperator p-3 grid grid-cols-[1fr_30px] justify-between"
                  >
                    {repo.name}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRepoIds(r => r.filter(x => x !== repo.id))
                      }
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
      </div>
      <div className="grid grid-cols-[1fr_min-content] justify-between items-center pb-5">
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
