import React from 'react';
import emptySvgPath from './empty.svg';

type Props = {
  isBug: boolean;
};

const NoSelectedPills = ({ isBug }: Props) => {
  return (
    <div className="self-center text-center text-sm text-theme-helptext w-full">
      <img src={emptySvgPath} alt="No results" className="m-4 mt-6 block mx-auto" />
      <h1 className="text-base mb-2 font-medium">Nothing selected</h1>
      <p>Please select {isBug ? 'an environment' : 'a type'} above.</p>
    </div>
  );
};

export default NoSelectedPills;
