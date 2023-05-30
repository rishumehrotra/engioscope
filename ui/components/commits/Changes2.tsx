import React from 'react';
import { num } from '../../helpers/utils.js';

const Changes: React.FC<{ add: number; edit: number; deleteCount: number }> = ({
  add,
  edit,
  deleteCount,
}) => (
  <div className="grid grid-cols-3 gap-5">
    <div className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-green-700">
      <p data-tip={`Added ${num(add)} files`}>{add ? `+${num(add)}` : ' '}</p>
    </div>
    <div
      data-tip={`Modified ${num(edit)} files`}
      className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-400"
    >
      {edit ? `~${num(edit)}` : ' '}
    </div>
    <div
      data-tip={`Deleted code in ${num(deleteCount)} files`}
      className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-700"
    >
      {deleteCount ? `-${num(deleteCount)}` : ' '}
    </div>
  </div>
);

export default Changes;
