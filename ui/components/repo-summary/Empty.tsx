import type { ReactNode } from 'react';
import React from 'react';

type Props = {
  heading?: ReactNode;
  body: ReactNode;
};

export const HappyEmpty = ({ heading = 'Hooray!', body }: Props) => {
  return (
    <div className="my-32 text-center">
      <img src="/images/happy-empty.svg" alt="Hooray!" className="m-auto" />
      <h3>{heading}</h3>
      <p className="text-sm my-4 text-theme-helptext">{body}</p>
    </div>
  );
};

export const SadEmpty = ({ heading = 'Nothing found', body }: Props) => {
  return (
    <div className="my-32 text-center">
      <img src="/images/sad-empty.svg" alt="Nothing found" className="m-auto" />
      <h3>{heading}</h3>
      <p className="text-sm my-4 text-theme-helptext">{body}</p>
    </div>
  );
};
