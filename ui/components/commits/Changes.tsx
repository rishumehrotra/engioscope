import React from 'react';
import { num } from '../../helpers/utils.js';
import type { Dev } from '../../types.js';

const Changes: React.FC<{ changes: Dev['repos'][number]['changes'] }> = ({ changes }) => (
  <div className="grid grid-cols-3 gap-5">
    <div className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-green-700">
      <p
        data-tooltip-id="react-tooltip"
        data-tooltip-content={`Added ${num(changes.add)} files`}
      >
        {changes.add ? `+${num(changes.add)}` : ' '}
      </p>
    </div>
    <div
      data-tooltip-id="react-tooltip"
      data-tooltip-content={`Modified ${num(changes.edit)} files`}
      className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-400"
    >
      {changes.edit ? `~${num(changes.edit)}` : ' '}
    </div>
    <div
      data-tooltip-id="react-tooltip"
      data-tooltip-content={`Deleted code in ${num(changes.delete)} files`}
      className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-700"
    >
      {changes.delete ? `-${num(changes.delete)}` : ' '}
    </div>
  </div>
);

export default Changes;
