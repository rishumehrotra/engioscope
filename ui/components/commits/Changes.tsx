import React from 'react';
import { num } from '../../helpers/utils';
import type { Dev } from '../../types';

const Changes: React.FC<{changes: Dev['repos'][number]['changes']}> = ({ changes }) => (
  <span className="grid grid-cols-3 gap-5">
    <td className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-green-700">
      <p data-tip={`Added ${num(changes.add)} files`}>
        {changes.add
          ? `+${num(changes.add)}`
          : ' '}
      </p>
    </td>
    <td
      data-tip={`Modified ${num(changes.edit)} files`}
      className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-400"
    >
      {changes.edit
        ? `~${num(changes.edit)}`
        : ' '}
    </td>
    <td
      data-tip={`Deleted code in ${num(changes.delete)} files`}
      className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-700"
    >
      {changes.delete
        ? `-${num(changes.delete)}`
        : ' '}
    </td>
  </span>
);

export default Changes;
