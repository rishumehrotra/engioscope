/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import type { ReactNode } from 'react';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import useDropdownMenu from 'react-accessible-dropdown-menu-hook';
import { Copy, Edit3, Plus, Sliders, Trash2 } from 'react-feather';
import useQueryParam, { asBoolean, asStringArray } from '../../hooks/use-query-param.js';
import { useModal2 } from '../common/Modal2.jsx';
import Loading from '../Loading.jsx';
import { trpc } from '../../helpers/trpc.js';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';

const TeamSelectorModal = React.lazy(() => import('./TeamSelectorModal.jsx'));

const DeleteModal = () => {
  return <div>Hello world</div>;
};

const TeamsSelector = () => {
  const [isEnabled] = useQueryParam('enable-teams', asBoolean);
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
          body: <DeleteModal />,
          modalClassName: 'max-h-content mt-[10%]',
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

  if (!isEnabled) return null;

  return (
    <>
      <Modal
        heading={modalContents.heading}
        {...modalProps}
        className={modalContents.modalClassName ?? 'max-h-[56rem] max-w-4xl my-36'}
      >
        <Suspense fallback={<Loading />}>{modalContents.body}</Suspense>
      </Modal>
      <div className="inline-flex items-stretch gap-3 mb-4">
        <select value={teamsQueryParam?.[0] || 'All teams'} onChange={setTeamNames}>
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
                  className="grid grid-cols-[min-content_1fr] justify-start items-center gap-x-2 px-3 py-2 pr-8 cursor-pointer hover:bg-theme-danger hover:text-theme-danger focus-visible:bg-theme-danger focus-visible:text-theme-danger group"
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
