import React from 'react';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';

const RowLabel = ({ config, label }: { config: SingleWorkItemConfig; label: string }) => {
  return (
    <div className="flex flex-row">
      <img
        src={config.icon}
        className="px-1"
        alt={`Icon for ${config.name[1]}`}
        width="25px"
      />
      <span className="inline-block">{label}</span>
    </div>
  );
};

export default RowLabel;
