import React, { useEffect, useState } from 'react';
import type { UIChangeProgram } from '../../shared/types';
import { organizeBy } from '../components/change-program/change-program-utils';
import GroupedListing from '../components/change-program/GroupedListing';
import Switcher from '../components/common/Switcher';
import Header from '../components/Header';
import Loading from '../components/Loading';
import useQueryParam, { asString } from '../hooks/use-query-param';
import { changeProgramDetails } from '../network';

const ChangeProgram: React.FC = () => {
  const [changeProgram, setChangeProgram] = useState<UIChangeProgram | null>(null);
  useEffect(() => { changeProgramDetails().then(setChangeProgram); }, []);
  const [show, setShow] = useQueryParam('show', asString);

  return (
    <>
      <Header
        title={changeProgram?.details?.name || 'Change program'}
        lastUpdated={changeProgram ? new Date(changeProgram.lastUpdateDate) : null}
      />
      <div className="mx-32">
        {!changeProgram
          ? <Loading />
          : (
            <div className="mt-8 bg-gray-50">
              {!changeProgram.details
                ? 'Change program not configured'
                : (
                  <>
                    <div className="mt-8 bg-gray-50 grid grid-cols-1">
                      <div className="text-right justify-self-end">
                        <div className="flex items-center">
                          <span className="inline-block pr-2 uppercase text-xs font-semibold">View by</span>
                          <Switcher
                            options={[
                              { label: 'Teams', value: 'teams' },
                              { label: 'Themes', value: 'theme' }
                            ]}
                            onChange={value => setShow(value === 'teams' ? undefined : value, true)}
                            value={show === undefined ? 'teams' : show}
                          />
                        </div>
                      </div>
                    </div>
                    <GroupedListing {...organizeBy(show ? 'theme' : 'team')(changeProgram.details.tasks)} />
                  </>
                )}
            </div>
          )}
      </div>
    </>
  );
};

export default ChangeProgram;
