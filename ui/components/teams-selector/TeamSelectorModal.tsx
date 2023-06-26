import React from 'react';

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
            />

            <div className="grid grid-flow-col grid-col-2 justify-between items-center text-sm border-x-[1px] border-theme-seperator p-2">
              <div className="text-theme-icon">
                Showing <span className="font-semibold">x</span> repositories
              </div>
              <div>
                <button className="link-text font-semibold">Add all</button>
              </div>
            </div>
          </div>

          <div className="overflow-auto flex-grow h-1 border-x-[1px] border-theme-seperator border-b-[1px] rounded-b-md">
            Hello world
          </div>
        </div>
        <div className="flex flex-col border rounded-md border-theme-seperator mr-6 mb-4">
          <div>
            <div className="grid grid-flow-col grid-col-2 justify-between items-center text-sm border-x-[1px] border-theme-seperator p-2">
              <div className="text-theme-icon">
                <span className="font-semibold">x</span> repositories added
              </div>
              <div>
                <button className="link-text font-semibold">Remove all</button>
              </div>
            </div>
          </div>
          <div className="overflow-auto flex-grow h-1">World</div>
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
