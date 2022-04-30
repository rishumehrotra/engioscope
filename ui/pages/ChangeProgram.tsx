import React, { useEffect, useState } from 'react';
import type { UIChangeProgram } from '../../shared/types';
import ByTheme from '../components/change-program/ByTheme';
import Header from '../components/Header';
import Loading from '../components/Loading';
import { changeProgramDetails } from '../network';

const ChangeProgram: React.FC = () => {
  const [changeProgram, setChangeProgram] = useState<UIChangeProgram | null>(null);
  useEffect(() => { changeProgramDetails().then(setChangeProgram); }, []);

  return (
    <>
      <Header
        title={changeProgram?.details?.name || 'Change program'}
        lastUpdated={changeProgram ? new Date(changeProgram.lastUpdateDate) : null}
      />
      <div className="mx-32">
        {changeProgram?.details ? (
          <ByTheme changeProgramDetails={changeProgram.details} />
        ) : (
          <Loading />
        )}
      </div>
    </>
  );
};

export default ChangeProgram;
