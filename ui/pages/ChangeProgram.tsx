import React, { useEffect, useState } from 'react';
import type { UIChangeProgram } from '../../shared/types.js';
import { organizeBy } from '../components/change-program/change-program-utils.js';
import GroupedListing from '../components/change-program/GroupedListing.js';
import ChangeProgramNavBar from '../components/ChangeProgramNavBar.js';
import Switcher from '../components/common/Switcher.js';
import Loading from '../components/Loading.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import { changeProgramDetails } from '../network.js';

const ChangeProgram: React.FC = () => {
  const [changeProgram, setChangeProgram] = useState<UIChangeProgram | null>(null);
  useEffect(() => {
    // TODO: Error handling
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    changeProgramDetails().then(setChangeProgram);
  }, []);
  const [show, setShow] = useQueryParam('show', asString);
  const setHeaderDetails = useSetHeaderDetails();

  useEffect(() => {
    setHeaderDetails({
      globalSettings: changeProgram,
      title: 'Progress'
    });
  }, [changeProgram, setHeaderDetails]);

  return (
    <>
      <div className="mx-32 bg-gray-50 rounded-t-lg" style={{ marginTop: '-2.25rem' }}>
        <ChangeProgramNavBar
          right={(
            <div className="flex items-center">
              <span className="inline-block pr-2 uppercase text-xs font-semibold w-20 text-right">View by</span>
              <Switcher
                options={[
                  { label: 'Teams', value: 'teams' },
                  { label: 'Themes', value: 'theme' }
                ]}
                onChange={value => setShow(value === 'teams' ? undefined : value, true)}
                value={show === undefined ? 'teams' : show}
              />
            </div>
          )}
        />
      </div>

      <div className="mx-32">
        {!changeProgram
          ? <Loading />
          : (
            <div className="mt-8 bg-gray-50">
              {!changeProgram.details
                ? 'Change program not configured'
                : (
                  <GroupedListing
                    groups={organizeBy(show ? 'theme' : 'team')(changeProgram.details.tasks)}
                  />
                )}
            </div>
          )}
      </div>
    </>
  );
};

export default ChangeProgram;
