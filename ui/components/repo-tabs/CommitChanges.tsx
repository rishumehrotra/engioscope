import React from 'react';
import { num } from '../../helpers/utils.js';

const CommitChanges: React.FC<{
  add: number;
  edit: number;
  totalDelete: number;
}> = ({ add, edit, totalDelete }) => (
  <div className="grid grid-cols-3 gap-5">
    <div className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-green-700">
      <p data-tip={`Added ${num(add)} files`}>
        {add || add !== 0 ? `+${num(add)}` : ' '}
      </p>
    </div>
    <div
      data-tip={`Modified ${num(edit)} files`}
      className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-400"
    >
      {edit || edit !== 0 ? `~${num(edit)}` : ' '}
    </div>
    <div
      data-tip={`Deleted code in ${num(totalDelete)} files`}
      className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-700"
    >
      {totalDelete || totalDelete !== 0 ? `-${num(totalDelete)}` : ' '}
    </div>
  </div>
);

export default CommitChanges;
