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

  return <div>TeamSelectorModal</div>;
};

export default TeamSelectorModal;
