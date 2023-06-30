/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import type { ReactNode } from 'react';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import useDropdownMenu from 'react-accessible-dropdown-menu-hook';
import { Copy, Edit3, Plus, Sliders, Trash2 } from 'react-feather';
import useQueryParam, { asStringArray } from '../../hooks/use-query-param.js';
import { useModal2 } from '../common/Modal2.jsx';
import Loading from '../Loading.jsx';
import { trpc } from '../../helpers/trpc.js';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';

const TeamSelectorModal = React.lazy(() => import('./TeamSelectorModal.jsx'));

type DeleteModalProps = {
  onSuccess: () => void;
  onCancel: () => void;
};

const DeleteModal: React.FC<DeleteModalProps> = ({ onSuccess, onCancel }) => {
  const deleteTeam = trpc.teams.deleteTeam.useMutation();
  const [teamNameInQueryParam, setTeamNameInQueryParam] = useQueryParam(
    'teams',
    asStringArray
  );
  const cnp = useCollectionAndProject();
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<'unknown' | null>(null);

  const onDelete = useCallback(() => {
    setDisabled(true);
    setError(null);

    return (
      deleteTeam
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .mutateAsync({ ...cnp, teamName: teamNameInQueryParam![0] })
        .then(() => {
          // eslint-disable-next-line unicorn/no-useless-undefined
          setTeamNameInQueryParam(undefined);
          onSuccess();
        })
        .catch(() => {
          setError('unknown');
        })
        .finally(() => {
          setDisabled(false);
        })
    );
  }, [cnp, deleteTeam, onSuccess, setTeamNameInQueryParam, teamNameInQueryParam]);

  return (
    <div className="px-6 py-4">
      <h3 className="font-medium">Are you sure you want to delete this team</h3>
      <p className="text-theme-helptext my-2">
        This will delete the team permanently. You cannot undo this action.
      </p>
      {error === 'unknown' ? (
        <p className="text-theme-danger">Something went wrong. Please try again.</p>
      ) : null}
      <div className="text-right mt-3">
        <button
          disabled={disabled}
          className="secondary-button inline-block mr-3"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button disabled={disabled} className="danger-button" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
};

const TeamsSelector = () => {
  const cnp = useCollectionAndProject();
  const teamNames = trpc.teams.getTeamNames.useQuery(cnp);
  const [teamsQueryParam, setTeamsQueryParam] = useQueryParam('teams', asStringArray);

  const {
    buttonProps,
    itemProps,
    isOpen,
    setIsOpen: setDropdownOpen,
  } = useDropdownMenu(teamsQueryParam ? 4 : 1);
  const [Modal, modalProps, openModal, , closeModal] = useModal2();
  const [modalContents, setModalContents] = useState<{
    heading: string;
    body: ReactNode;
    modalClassName?: string;
  }>({
    heading: '',
    body: '',
  });

  const modalHandlers = useMemo(
    () => ({
      onSuccess: () => {
        closeModal();
        return teamNames.refetch();
      },
      onCancel: closeModal,
    }),
    [closeModal, teamNames]
  );

  const onMenuItemClick = useCallback(
    (option: 'create' | 'edit' | 'duplicate' | 'delete') => {
      setDropdownOpen(false);
      if (option === 'create' || option === 'duplicate') {
        setModalContents({
          heading: 'Create a new team',
          body: <TeamSelectorModal type={option} {...modalHandlers} />,
        });
        openModal();
      }

      if (option === 'edit' && teamsQueryParam?.[0]) {
        setModalContents({
          heading: 'Edit team',
          body: <TeamSelectorModal type="edit" {...modalHandlers} />,
        });
        openModal();
      }

      if (option === 'delete' && teamsQueryParam?.[0]) {
        setModalContents({
          heading: `Delete ${teamsQueryParam[0]}`,
          body: <DeleteModal {...modalHandlers} />,
          modalClassName: 'w-[500px] max-w-[80%]',
        });
        openModal();
      }
    },
    [modalHandlers, openModal, setDropdownOpen, teamsQueryParam]
  );

  const setTeamNames: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    e => {
      const selectedValue = e.target.value === 'All teams' ? undefined : [e.target.value];
      setTeamsQueryParam(selectedValue, true);
    },
    [setTeamsQueryParam]
  );

  return (
    <>
      <Modal
        heading={modalContents.heading}
        {...modalProps}
        className={
          modalContents.modalClassName ?? 'w-11/12 max-w-4xl h-full max-h-[70vh]'
        }
      >
        <Suspense fallback={<Loading />}>{modalContents.body}</Suspense>
      </Modal>
      <div className="inline-flex items-stretch gap-3">
        <select
          value={teamsQueryParam?.[0] || 'All teams'}
          onChange={setTeamNames}
          className="w-72"
        >
          <option value="All teams">All teams</option>
          {teamNames.data?.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="relative inline-block">
          <button
            {...buttonProps}
            className={`button bg-theme-page-content inline-block h-full px-2.5 hover:text-theme-highlight ${
              isOpen ? 'text-theme-highlight' : 'text-theme-icon'
            }`}
          >
            <Sliders size={20} />
          </button>
          <div
            className={`${
              isOpen ? 'visible' : 'invisible'
            } absolute w-max bg-theme-page-content shadow-lg mt-1`}
            role="menu"
          >
            <a
              {...itemProps[0]}
              onClick={() => onMenuItemClick('create')}
              className="grid grid-cols-[min-content_1fr] justify-start items-center gap-x-2 px-3 py-2 pr-8 cursor-pointer hover:bg-theme-secondary focus-visible:bg-theme-secondary"
            >
              <Plus size={20} />
              <span>Create a new team</span>
              <span className="col-start-2 text-theme-icon text-sm">
                Create a list of repositories for easy reference
              </span>
            </a>
            {teamsQueryParam?.[0] ? (
              <>
                <a
                  {...itemProps[1]}
                  onClick={() => onMenuItemClick('edit')}
                  className="grid grid-cols-[min-content_1fr] justify-start items-center gap-x-2 px-3 py-2 pr-8 cursor-pointer hover:bg-theme-secondary focus-visible:bg-theme-secondary"
                >
                  <Edit3 size={20} />
                  <span>Edit {teamsQueryParam[0]}</span>
                  <span className="col-start-2 text-theme-icon text-sm">
                    Edit the list of repositories in {teamsQueryParam[0]}
                  </span>
                </a>
                <a
                  {...itemProps[2]}
                  onClick={() => onMenuItemClick('duplicate')}
                  className="grid grid-cols-[min-content_1fr] justify-start items-center gap-x-2 px-3 py-2 pr-8 cursor-pointer hover:bg-theme-secondary focus-visible:bg-theme-secondary"
                >
                  <Copy size={20} />
                  <span>Duplicate {teamsQueryParam[0]}</span>
                  <span className="col-start-2 text-theme-icon text-sm">
                    Create a copy of ${teamsQueryParam[0]} for your customisation
                  </span>
                </a>
                <a
                  {...itemProps[3]}
                  onClick={() => onMenuItemClick('delete')}
                  className="grid grid-cols-[min-content_1fr] justify-start items-center gap-x-2 px-3 py-2 pr-8 cursor-pointer hover:bg-theme-danger-dim hover:text-theme-danger focus-visible:bg-theme-danger-dim focus-visible:text-theme-danger group"
                >
                  <Trash2 size={20} />
                  <span>Delete {teamsQueryParam[0]}</span>
                  <span className="col-start-2 text-theme-icon group-hover:text-theme-danger group-focus-visible:text-theme-danger text-sm">
                    Permanently delete {teamsQueryParam[0]}
                  </span>
                </a>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamsSelector;
